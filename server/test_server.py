import asyncio
import json
import time
import uuid
from pathlib import Path

import chess
import pyseto
import pytest
from sqlmodel import Session, create_engine, select

import server
from feedback_store import (
    FeedbackValidationError,
    GameFeedbackRecord,
    MAX_FEEDBACK_NOTES_LENGTH,
    MAX_RESULT_MESSAGE_LENGTH,
    normalize_feedback_submission,
    save_feedback_submission,
)
from chess_engines import (
    compute_all_transitions,
    ensure_fen_is_in_transitions,
    ensure_valid_transition,
    get_available_engines,
)


def _make_token(fen: str, expiration: int | None = None) -> str:
    payload = json.dumps(
        {
            "sub": "compute_next_move",
            "exp": expiration or int(time.time()) + 60,
            "fen": fen,
        }
    ).encode()
    return pyseto.encode(server.key, payload).decode("utf-8")


def test_check_token_round_trip_returns_fen() -> None:
    fen = chess.Board().fen()
    token = _make_token(fen)

    assert server.check_token(token) == fen


def test_shutdown_all_sync_skips_when_loop_running(monkeypatch: pytest.MonkeyPatch) -> None:
    def fail_if_called(_awaitable: object) -> None:
        raise AssertionError("asyncio.run should not be called while an event loop is running")

    monkeypatch.setattr(server.asyncio, "get_running_loop", lambda: object())
    monkeypatch.setattr(server.asyncio, "run", fail_if_called)

    server.shutdown_all_sync()


def test_list_engines_returns_configured_profiles() -> None:
    response = get_available_engines()

    assert response
    assert sum(1 for engine in response if engine.default) == 1
    assert any(engine.key == "chess-potato-ai-3000" for engine in response)


def test_transition_helpers_accept_reachable_positions() -> None:
    start_fen = chess.Board().fen()
    board = chess.Board()
    board.push_uci("e2e4")
    target_fen = board.fen()

    ensure_valid_transition(start_fen, target_fen)

    transitions = compute_all_transitions([start_fen])
    ensure_fen_is_in_transitions(target_fen, transitions)


def test_transition_helpers_reject_unreachable_positions() -> None:
    board = chess.Board()
    board.push_uci("e2e4")
    board.push_uci("e7e5")

    with pytest.raises(ValueError):
        ensure_valid_transition(chess.Board().fen(), board.fen())


def test_normalize_feedback_submission_ignores_extra_fields() -> None:
    normalized = normalize_feedback_submission(
        {
            "feedback": {"enjoyment": "loved_it", "notes": "  Nice game  ", "ignored": True},
            "game": {
                "result": {"type": "draw", "message": "Draw", "ignored": "value"},
                "playerColor": "white",
                "selectedEngine": "chess-potato-ai-3000",
                "selectedEngineDisplayName": "Chess Potato AI 3000",
                "engineWasOffline": False,
                "usedTakeback": False,
                "finalFen": chess.Board().fen(),
            },
            "metadata": {
                "source": "web",
                "clientName": "chess-potato-ai-3000",
                "clientVersion": "1.0.0",
                "locale": "en",
                "userAgent": "ignored",
            },
            "history": [
                {
                    "san": "e4",
                    "playerKey": "human",
                    "engineName": None,
                    "engineDisplayName": None,
                    "fen": chess.Board().fen(),
                    "timestamp": 123,
                    "from": "e2",
                    "to": "e4",
                    "evaluationToken": "ignored",
                }
            ],
        }
    )

    assert normalized["feedback"]["enjoyment"] == "loved_it"
    assert normalized["feedback"]["notes"] == "Nice game"
    assert "ignored" not in normalized["feedback"]
    assert "userAgent" not in normalized["metadata"]
    assert "evaluationToken" not in normalized["history"][0]
    assert normalized["history"][0]["engineName"] is None


def test_validate_feedback_tokens_marks_validated_game() -> None:
    board = chess.Board()
    board.push_uci("e2e4")
    human_fen = board.fen()
    board.push_uci("e7e5")
    ai_fen = board.fen()
    ai_token = _make_token(ai_fen)

    raw_payload = {
        "feedback": {
            "enjoyment": "loved_it",
            "authenticity": "very_human",
            "notes": "Great game",
        },
        "game": {
            "result": {"type": "draw", "reason": "stalemate", "message": "Draw"},
            "playerColor": "white",
            "selectedEngine": "chess-potato-ai-3000",
            "selectedEngineDisplayName": "Chess Potato AI 3000",
            "engineWasOffline": False,
            "usedTakeback": False,
            "finalFen": ai_fen,
        },
        "metadata": {
            "source": "web",
            "clientName": "chess-potato-ai-3000",
            "clientVersion": "1.0.0",
            "locale": "en",
        },
        "history": [
            {
                "san": "e4",
                "playerKey": "human",
                "engineName": None,
                "engineDisplayName": None,
                "fen": human_fen,
                "timestamp": 1,
                "from": "e2",
                "to": "e4",
            },
            {
                "san": "e5",
                "playerKey": "chess-potato-ai-3000",
                "engineName": "chess-potato-ai-3000",
                "engineDisplayName": "Chess Potato AI 3000",
                "fen": ai_fen,
                "evaluationToken": ai_token,
                "continuationToken": ai_token,
                "timestamp": 2,
                "from": "e7",
                "to": "e5",
            },
        ],
    }

    normalized = normalize_feedback_submission(raw_payload)
    validated, issues = server.validate_feedback_tokens(raw_payload, normalized)

    assert validated is True
    assert issues == []


def test_validate_feedback_tokens_marks_invalid_token_chain() -> None:
    board = chess.Board()
    board.push_uci("e2e4")
    human_fen = board.fen()
    board.push_uci("e7e5")
    ai_fen = board.fen()
    wrong_token = _make_token(chess.Board().fen())

    raw_payload = {
        "feedback": {
            "enjoyment": "loved_it",
            "authenticity": "very_human",
            "notes": "Great game",
        },
        "game": {
            "result": {"type": "draw", "reason": "stalemate", "message": "Draw"},
            "playerColor": "white",
            "selectedEngine": "chess-potato-ai-3000",
            "selectedEngineDisplayName": "Chess Potato AI 3000",
            "engineWasOffline": False,
            "usedTakeback": False,
            "finalFen": ai_fen,
        },
        "metadata": {
            "source": "web",
            "clientName": "chess-potato-ai-3000",
            "clientVersion": "1.0.0",
            "locale": "en",
        },
        "history": [
            {
                "san": "e4",
                "playerKey": "human",
                "engineName": None,
                "engineDisplayName": None,
                "fen": human_fen,
                "timestamp": 1,
                "from": "e2",
                "to": "e4",
            },
            {
                "san": "e5",
                "playerKey": "chess-potato-ai-3000",
                "engineName": "chess-potato-ai-3000",
                "engineDisplayName": "Chess Potato AI 3000",
                "fen": ai_fen,
                "evaluationToken": wrong_token,
                "timestamp": 2,
                "from": "e7",
                "to": "e5",
            },
        ],
    }

    normalized = normalize_feedback_submission(raw_payload)
    validated, issues = server.validate_feedback_tokens(raw_payload, normalized)

    assert validated is False
    assert issues


def test_normalize_feedback_submission_rejects_oversized_payload() -> None:
    with pytest.raises(FeedbackValidationError):
        normalize_feedback_submission(
            {
                "feedback": {
                    "enjoyment": "loved_it",
                    "authenticity": "very_human",
                    "notes": "x" * 20000,
                },
                "game": {
                    "result": {"type": "win", "message": "Victory"},
                    "playerColor": "white",
                    "selectedEngine": "chess-potato-ai-3000",
                    "selectedEngineDisplayName": "Chess Potato AI 3000",
                    "engineWasOffline": False,
                    "usedTakeback": False,
                    "finalFen": chess.Board().fen(),
                },
                "metadata": {
                    "source": "web",
                    "clientName": "chess-potato-ai-3000",
                    "clientVersion": "1.0.0",
                    "locale": "en",
                },
                "history": [
                    {
                        "san": "e4",
                        "playerKey": "human",
                        "engineName": None,
                        "engineDisplayName": None,
                        "fen": chess.Board().fen(),
                        "timestamp": 123,
                        "from": "e2",
                        "to": "e4",
                    }
                ],
            }
        )


def test_normalize_feedback_submission_accepts_longer_feedback_fields() -> None:
    normalized = normalize_feedback_submission(
        {
            "feedback": {
                "enjoyment": "loved_it",
                "authenticity": "very_human",
                "notes": "x" * MAX_FEEDBACK_NOTES_LENGTH,
            },
            "game": {
                "result": {
                    "type": "draw",
                    "reason": "checkmate-sequence-summary",
                    "message": "y" * MAX_RESULT_MESSAGE_LENGTH,
                },
                "playerColor": "white",
                "selectedEngine": "chess-potato-ai-3000",
                "selectedEngineDisplayName": "Chess Potato AI 3000",
                "engineWasOffline": False,
                "usedTakeback": False,
                "finalFen": chess.Board().fen(),
            },
            "metadata": {
                "source": "web",
                "clientName": "chess-potato-ai-3000",
                "clientVersion": "1.0.0",
                "locale": "en",
            },
            "history": [
                {
                    "san": "e4",
                    "playerKey": "human",
                    "engineName": None,
                    "engineDisplayName": None,
                    "fen": chess.Board().fen(),
                    "timestamp": 123,
                    "from": "e2",
                    "to": "e4",
                }
            ],
        }
    )

    assert normalized["feedback"]["notes"] == "x" * MAX_FEEDBACK_NOTES_LENGTH
    assert normalized["game"]["result"]["message"] == "y" * MAX_RESULT_MESSAGE_LENGTH


def test_save_feedback_submission_persists_record(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    database_path = tmp_path / "feedback.db"
    test_engine = create_engine(f"sqlite:///{database_path}", echo=False)

    monkeypatch.setattr("feedback_store.engine", test_engine)

    raw_payload = {
            "feedback": {
                "enjoyment": "loved_it",
                "authenticity": "very_human",
                "notes": "Great game",
            },
            "game": {
                "result": {
                    "type": "win",
                    "reason": "checkmate",
                    "message": "Congratulations! You won!",
                },
                "playerColor": "white",
                "selectedEngine": "chess-potato-ai-3000",
                "selectedEngineDisplayName": "Chess Potato AI 3000",
                "engineWasOffline": False,
                "usedTakeback": False,
                "finalFen": chess.Board().fen(),
            },
            "metadata": {
                "source": "web",
                "clientName": "chess-potato-ai-3000",
                "clientVersion": "1.0.0",
                "locale": "en",
            },
            "history": [
                {
                    "san": "e4",
                    "playerKey": "human",
                    "engineName": None,
                    "engineDisplayName": None,
                    "fen": chess.Board().fen(),
                    "timestamp": 123,
                    "from": "e2",
                    "to": "e4",
                }
            ],
        }

    normalized = normalize_feedback_submission(raw_payload)
    record = save_feedback_submission(
        "submission-1",
        normalized,
        tokens_validated=False,
        validation_issues=["no validation token present in move history"],
    )

    assert record.id is not None
    assert record.is_valid is True

    with Session(test_engine) as session:
        saved = session.exec(select(GameFeedbackRecord)).one()

    assert saved.submission_id == "submission-1"
    assert saved.feedback_notes == "Great game"
    assert saved.move_count == 1
    assert json.loads(saved.history_json) == normalized["history"]
    assert saved.tokens_validated is False


def test_submit_game_feedback_uses_uuid7_submission_id(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    captured_submission_ids: list[str] = []

    class SavedRecord:
        def __init__(self, submission_id: str) -> None:
            self.submission_id = submission_id

    def fake_save_feedback_submission(
        submission_id: str,
        normalized_payload: dict[str, object],
        *,
        tokens_validated: bool,
        validation_issues: list[str],
    ) -> SavedRecord:
        captured_submission_ids.append(submission_id)
        return SavedRecord(submission_id)

    monkeypatch.setattr(server, "save_feedback_submission", fake_save_feedback_submission)

    response = asyncio.run(
        server.submit_game_feedback(
            {
                "feedback": {
                    "enjoyment": "loved_it",
                    "authenticity": "very_human",
                    "notes": "Great game",
                },
                "game": {
                    "result": {
                        "type": "win",
                        "reason": "checkmate",
                        "message": "Congratulations! You won!",
                    },
                    "playerColor": "white",
                    "selectedEngine": "chess-potato-ai-3000",
                    "selectedEngineDisplayName": "Chess Potato AI 3000",
                    "engineWasOffline": False,
                    "usedTakeback": False,
                    "finalFen": chess.Board().fen(),
                },
                "metadata": {
                    "source": "web",
                    "clientName": "chess-potato-ai-3000",
                    "clientVersion": "1.0.0",
                    "locale": "en",
                },
                "history": [
                    {
                        "san": "e4",
                        "playerKey": "human",
                        "engineName": None,
                        "engineDisplayName": None,
                        "fen": chess.Board().fen(),
                        "timestamp": 123,
                        "from": "e2",
                        "to": "e4",
                    }
                ],
            }
        )
    )

    assert captured_submission_ids == [response.submission_id]
    assert uuid.UUID(response.submission_id).version == 7

import json
import time

import chess
import pyseto
import pytest

import server
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

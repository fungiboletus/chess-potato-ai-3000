from collections.abc import Callable

import chess

import main
from utils import board_to_unicode


def _build_engine(monkeypatch) -> main.ChessEngine:
    def fake_hybrid_engine(
        board: chess.Board,
        compute_next_move: Callable[[], str],
        max_attempts: int = 5,
    ) -> str:
        return compute_next_move()

    monkeypatch.setattr(
        main,
        "create_hybrid_engine",
        lambda: (fake_hybrid_engine, lambda: None),
    )
    monkeypatch.setattr(
        main,
        "analyze_chess_position",
        lambda board: "position looks playable",
    )
    monkeypatch.setattr(main, "ask_for_a_move", lambda **kwargs: "e2e4")
    return main.ChessEngine()


def test_board_to_unicode_renders_starting_position() -> None:
    board = chess.Board()
    rendered = board_to_unicode(board)

    assert "8 ♜ ♞ ♝ ♛ ♚ ♝ ♞ ♜" in rendered
    assert "1 ♖ ♘ ♗ ♕ ♔ ♗ ♘ ♖" in rendered
    assert rendered.rstrip().endswith("a b c d e f g h")


def test_set_position_applies_moves(monkeypatch) -> None:
    engine = _build_engine(monkeypatch)

    engine.set_position("position startpos moves e2e4 e7e5 g1f3")

    assert engine.board.fen() == chess.Board(
        "rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2"
    ).fen()


def test_select_move_returns_only_legal_move(monkeypatch, capsys) -> None:
    engine = _build_engine(monkeypatch)
    engine.board = chess.Board("7k/8/6K1/6Q1/8/8/8/8 b - - 0 1")

    move = engine.select_move(time_left=30.0)

    assert move == "h8g8"
    assert "Only one legal move available" in capsys.readouterr().out


def test_set_option_updates_engine_flags(monkeypatch, capsys) -> None:
    engine = _build_engine(monkeypatch)

    engine.set_option("setoption name MaxAttempts value 7")
    engine.set_option("setoption name NoLLM value true")
    engine.set_option("setoption name PanicModeThreshold value 12")

    output = capsys.readouterr().out
    assert engine.max_attempts == 7
    assert engine.no_llm is True
    assert engine.panic_mode_threshold == 12.0
    assert "MaxAttempts set to 7" in output

"""Chess position evaluation using Stockfish's NNUE analysis."""

import atexit
import logging
from typing import TypedDict

import chess
import chess.engine
from async_lru import alru_cache

logger = logging.getLogger(__name__)

# Global persistent Stockfish engine instance
_stockfish_engine: chess.engine.UciProtocol | None = None


class EvaluationResult(TypedDict):
    """Result of position evaluation."""

    expectation: float  # Win/Draw/Loss expectation (0.0 to 1.0)
    score: int  # Centipawn score (positive = advantage, ±10000 for mate)


async def get_stockfish_evaluator() -> chess.engine.UciProtocol:
    """Get or initialize the persistent Stockfish engine for evaluation."""
    global _stockfish_engine
    if _stockfish_engine is None:
        logger.info("Initializing Stockfish engine for evaluation")
        _transport, stockfish_engine = await chess.engine.popen_uci("stockfish")
        _stockfish_engine = stockfish_engine
    return _stockfish_engine


async def shutdown_evaluator() -> None:
    """Gracefully shutdown the Stockfish evaluator engine."""
    global _stockfish_engine
    if _stockfish_engine is not None:
        try:
            await _stockfish_engine.quit()
        except Exception as e:
            logger.warning(f"Error shutting down evaluator engine: {e}")
        finally:
            _stockfish_engine = None


def shutdown_evaluator_sync() -> None:
    """Synchronously shut down the evaluator for interpreter exit hooks."""
    try:
        import asyncio

        asyncio.run(shutdown_evaluator())
    except RuntimeError:
        logger.debug("Skipping evaluator shutdown because no event loop can be started")


@alru_cache(maxsize=1024)
async def evaluate_position(
    fen: str, depth: int = 10, inverse_turn: bool = False
) -> EvaluationResult:
    """
    Evaluate a chess position using Stockfish's NNUE evaluation.

    Args:
        fen: The chess position in FEN (Forsyth-Edwards Notation) format
        depth: Search depth for analysis (default: 10)
        inverse_turn: If True, evaluate from opponent's perspective (default: False)

    Returns:
        EvaluationResult containing:
            - expectation: WDL expectation value between 0.0 (losing) and 1.0 (winning)
            - score: Centipawn evaluation (positive = advantage, ±10000 for mate positions)

    Raises:
        ValueError: If the FEN is invalid or engine fails
    """
    try:
        # Create board from FEN
        board = chess.Board(fen)

        # Get the persistent Stockfish engine
        engine = await get_stockfish_evaluator()

        # Analyze the position
        logger.debug(f"Evaluating position at depth {depth}: {fen}")
        info = await engine.analyse(board, chess.engine.Limit(depth=depth, time=2.0))

        score_info = info.get("score")
        if score_info is None:
            raise ValueError(
                "Stockfish engine did not return a score for the given position"
            )

        # Extract score from the perspective of the current player (or inverse)
        score = score_info.pov(board.turn ^ inverse_turn)

        # Calculate Win/Draw/Loss expectation
        wdl = score.wdl(ply=board.ply())
        expectation = wdl.expectation()

        # Get centipawn score (using mate_score=10000 for checkmate positions)
        centipawn_score = score.score(mate_score=10_000)

        logger.debug(
            f"Evaluation result - Expectation: {expectation:.3f}, Score: {centipawn_score}"
        )

        return {"expectation": expectation, "score": centipawn_score}

    except chess.engine.EngineTerminatedError as e:
        raise ValueError(f"Stockfish engine error: {e}") from e
    except ValueError as e:
        raise ValueError(f"Invalid FEN string: {e}") from e
    except Exception as e:
        raise ValueError(f"Error evaluating position: {e}") from e


# Register cleanup on exit
atexit.register(shutdown_evaluator_sync)

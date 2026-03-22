from __future__ import annotations

import bisect
import csv
import os
import random
import time
from collections.abc import Callable, Sequence
from typing import Protocol, TypedDict

import chess
import chess.engine


class EvalData(TypedDict):
    x: list[float]
    low_elo: list[float]
    my_engine: list[float]


Interpolator = Callable[[float], float]
ComputeNextMove = Callable[[], str]

DEFAULT_EVAL_POINTS_PATH = "./data/eval_points.csv"
EVAL_POINTS_CSV_PATH = os.environ.get("EVAL_POINTS_CSV", DEFAULT_EVAL_POINTS_PATH)
DEFAULT_STOCKFISH_PATH = os.environ.get("STOCKFISH_EXECUTABLE", "stockfish")


class HybridEngine(Protocol):
    def __call__(
        self,
        board: chess.Board,
        compute_next_move: ComputeNextMove,
        max_attempts: int = 5,
    ) -> str: ...


def load_eval_data(file_path: str | None = None) -> EvalData:
    """Load evaluation data from the provided CSV file.

    The CSV should have a header with
    'eval_points', 'low_elo', and 'my_bad_engine' columns.

    Each following row should contain IEEE 754 float values.
    If file_path is not provided, the EVAL_POINTS_CSV environment variable is
    used when set, otherwise defaults to ./data/eval_points.csv.
    """
    resolved_path = file_path or EVAL_POINTS_CSV_PATH
    x_values: list[float] = []
    low_elo_values: list[float] = []
    my_engine_values: list[float] = []
    with open(resolved_path, 'r') as f:
        for row in csv.DictReader(f):
            x_values.append(float(row['eval_points']))
            low_elo_values.append(float(row['low_elo']))
            my_engine_values.append(float(row['my_bad_engine']))

    return {
        'x': x_values,
        'low_elo': low_elo_values,
        'my_engine': my_engine_values
    }


def create_nearest_interpolator(
    x_values: Sequence[float],
    y_values: Sequence[float],
) -> Interpolator:
    """Create an interpolator that pre-sorts data once for efficient lookups."""
    # Sort x_values and keep matching y_values (done once)
    pairs = sorted(zip(x_values, y_values))
    x_sorted: list[float] = [p[0] for p in pairs]
    y_sorted: list[float] = [p[1] for p in pairs]
    n = len(x_sorted)

    def interpolate(x: float) -> float:
        """Fast nearest neighbor lookup for a single value."""
        idx = bisect.bisect_left(x_sorted, x)
        if idx == 0:
            return y_sorted[0]
        elif idx == n:
            return y_sorted[-1]
        else:
            # Compare distances to find nearest neighbor
            if abs(x - x_sorted[idx - 1]) <= abs(x - x_sorted[idx]):
                return y_sorted[idx - 1]
            else:
                return y_sorted[idx]

    return interpolate

EXPECTATION_SATURATION = 0.95
EXPECTATION_SATURATION_EPSILON = 0.01
EXPECTATION_DIFF_EPSILON = 0.05
CENTIPAWN_DIFF_THRESHOLD = 1

def is_evaluation_saturated(
    expectation_before: float,
    expectation_diff: float,
    score_diff: int,
) -> bool:
    """Check if evaluation is saturated based on thresholds."""
    return (
        abs(expectation_before) > EXPECTATION_SATURATION and
        abs(expectation_diff) < EXPECTATION_DIFF_EPSILON and
        abs(score_diff) > CENTIPAWN_DIFF_THRESHOLD
    ) or (
        abs(expectation_before) < EXPECTATION_SATURATION_EPSILON and
        abs(expectation_diff) < EXPECTATION_SATURATION_EPSILON and
        abs(score_diff) > CENTIPAWN_DIFF_THRESHOLD
    )

def create_hybrid_engine(
    file_path: str | None = None,
    stockfish_path: str = DEFAULT_STOCKFISH_PATH,
) -> tuple[HybridEngine, Callable[[], None]]:
    """Create a function to determine if a retry is needed based on evaluation points."""
    data = load_eval_data(file_path)
    f_low_elo = create_nearest_interpolator(data['x'], data['low_elo'])
    g_my_engine = create_nearest_interpolator(data['x'], data['my_engine'])

    m_max_low_elo = max(data['low_elo'])

    stockfish_engine: chess.engine.SimpleEngine = chess.engine.SimpleEngine.popen_uci(
        stockfish_path
    )

    # Some jitters in the Stockfish evaluation
    ENGINE_EVAL_EPSILON = 0.01

    def eval_board(
        board: chess.Board,
        inverse_turn: bool = False,
        depth: int = 10,
    ) -> tuple[float, int]:
        """Evaluate board position using Stockfish."""
        info = stockfish_engine.analyse(
            board, chess.engine.Limit(depth=depth, time=2.0)
        )
        if 'score' not in info:
            raise ValueError("Stockfish analysis did not return a score")
        score = info['score'].pov(board.turn ^ inverse_turn)
        wdl = score.wdl(ply=board.ply())
        expectation = wdl.expectation()
        return expectation, score.score(mate_score=10_000)

    def eval_board_after_move(
        board: chess.Board,
        move: chess.Move,
    ) -> tuple[float, int]:
        """Evaluate board position after making a move."""
        temp_board = board.copy()
        temp_board.push(move)
        return eval_board(temp_board, inverse_turn=True)

    def evaluate_next_move(
        board: chess.Board,
        move: str,
        expectation_before: float | None = None,
        score_before: int | None = None,
    ) -> tuple[float, int]:
        """Evaluate a specific move and return expectation and score differences."""
        if expectation_before is None or score_before is None:
            expectation_before, score_before = eval_board(board)

        expectation_after, score_after = eval_board_after_move(
            board, chess.Move.from_uci(move)
        )

        expectation_diff = expectation_after - expectation_before
        score_diff = score_after - score_before

        print(f"info string Evaluating move {move}: "
              f"expectation_before={expectation_before:.3f}, "
              f"expectation_after={expectation_after:.3f}, "
              f"diff={expectation_diff:.3f}, "
              f"score_before={score_before}, "
              f"score_after={score_after}, "
              f"diff={score_diff}")
        return expectation_diff, score_diff

    def hybrid_engine(
        board: chess.Board,
        compute_next_move: ComputeNextMove,
        max_attempts: int = 5,
    ) -> str:
        nonlocal stockfish_engine

        start_time = time.time()
        candidates: list[str] = []
        weights: list[float] = []
        score_diffs: list[int] = []

        expectation_before, score_before = eval_board(board)

        # Send current position evaluation
        print(f"info score cp {score_before}")

        has_saturated_at_least_once = False

        for n in range(max_attempts):
            elapsed_time = int((time.time() - start_time) * 1000)  # Convert to milliseconds

            next_move = compute_next_move()
            print(f"info time {elapsed_time} currmovenumber {n + 1} "
                  f"currmove {next_move} pv {next_move}")

            candidates.append(next_move)
            expectation_diff, score_diff = evaluate_next_move(
                board, next_move, expectation_before, score_before
            )
            score_diffs.append(score_diff)

            if has_saturated_at_least_once:
                continue

            has_saturated = is_evaluation_saturated(
                expectation_before, expectation_diff, score_diff
            )

            if has_saturated:
                print(f"info string Evaluation {n} saturated for move {next_move}")
                has_saturated_at_least_once = True
                continue

            # Accept immediately when the evaluation is non-negative
            # It's a rare enough event.
            if expectation_diff >= -ENGINE_EVAL_EPSILON:
                elapsed_time = int((time.time() - start_time) * 1000)
                print(f"info time {elapsed_time} pv {next_move}")
                print(f"info string Move {next_move} accepted immediately (non-negative evaluation)")
                return next_move

            # Probabilistic acceptance based on the evaluation points
            x = expectation_diff
            f_y = f_low_elo(x)
            g_y = g_my_engine(x)
            acceptance = f_y / (m_max_low_elo * g_y)
            r_uniform = random.random()
            if r_uniform < acceptance:
                elapsed_time = int((time.time() - start_time) * 1000)
                print(f"info time {elapsed_time} pv {next_move}")
                print(f"info string Move {next_move} accepted probabilistically "
                      f"(acceptance={acceptance:.3f}, r={r_uniform:.3f})")
                return next_move  # Early accept

            weights.append(f_y / g_y)

        elapsed_time = int((time.time() - start_time) * 1000)
        print(f"info time {elapsed_time}")

        if has_saturated_at_least_once:
            print("info string Evaluation saturated at least once, fallback to centripawn diffs")
            best_move, best_score = max(zip(candidates, score_diffs), key=lambda x: x[1])
            print(f"info pv {best_move} score cp {best_score:+d}")
            return best_move

        print(f"info string No immediate acceptance, candidates: {candidates}, weights: {weights}")
        # If we have candidates, we select one based on weights
        # If we haven't found a move yet, we return the best candidate
        total_weight = sum(weights)
        r_weight = random.uniform(0, total_weight)
        cumulative_weight = 0.0
        for move, weight in zip(candidates, weights):
            cumulative_weight += weight
            if cumulative_weight >= r_weight:
                print(f"info time {elapsed_time} pv {move}")
                print(f"info string Selected weighted move: {move} "
                      f"(weight: {weight:.3f}, total: {total_weight:.3f})")
                return move


        # Crash as it should never happen
        raise RuntimeError("No move selected after all attempts, this should never happen.")

    def stop():
        """Stop the hybrid engine and close the Stockfish engine."""
        stockfish_engine.quit()

    return (hybrid_engine, stop)

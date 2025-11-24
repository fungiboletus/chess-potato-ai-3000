# Chess Potato AI 3000 - A UCI Chess Engine with Hybrid AI
# Copyright (C) 2025 Antoine Pultier
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program.  If not, see <https://www.gnu.org/licenses/>.

from __future__ import annotations

import random
import sys
import time
import traceback
from collections.abc import Callable

import chess

from ai import ask_for_a_move
from explain4 import analyze_chess_position
from hybrid import HybridEngine, create_hybrid_engine
from utils import board_to_unicode


class ChessEngine:
    """UCI chess engine template"""

    def __init__(self, name: str = "Chess-Potato-AI-3000", author: str = "Antoine"):
        self.name: str = name
        self.author: str = author
        self.board: chess.Board = chess.Board()
        engine, stop = create_hybrid_engine()
        self.hybrid_engine: HybridEngine = engine
        self.stop: Callable[[], None] = stop
        self.debug: bool = False

        # UCI options
        self.max_attempts: int = 5  # Default value
        self.no_llm: bool = False   # Default to using LLM
        self.panic_mode_threshold: float = 15.0  # Default panic mode threshold in seconds

    def uci(self) -> None:
        """Identify as a UCI engine and print engine info"""
        print(f"id name {self.name}")
        print(f"id author {self.author}")
        print(f"option name MaxAttempts type spin default {self.max_attempts} min 1 max 20")
        print(f"option name NoLLM type check default {'true' if self.no_llm else 'false'}")
        print(f"option name PanicModeThreshold type spin default {int(self.panic_mode_threshold)} min 1 max 60")
        print("uciok")

    def is_ready(self) -> None:
        """Respond that the engine is ready"""
        board = chess.Board()
        board_unicode: str = board_to_unicode(board)
        board_analyse: str = analyze_chess_position(board)
        legal_moves: list[str] = [move.uci() for move in board.legal_moves]
        best_move: str = ask_for_a_move(
            board_analyse=board_analyse,
            board_unicode=board_unicode,
            legal_moves=legal_moves,
        )
        print(f"info string Test AI best move in starting position: {best_move}")
        print("readyok")

    def set_position(self, command: str) -> None:
        """Set up the position on the internal board"""
        parts: list[str] = command.split(" ")

        if len(parts) < 2:
            return

        if parts[1] == "startpos":
            self.board = chess.Board()
            move_index: int = 2
        elif parts[1] == "fen":
            fen: str = " ".join(parts[2:8])  # FEN can contain spaces
            self.board = chess.Board(fen)
            move_index = 8
        else:
            return

        # Apply any moves that were included
        if len(parts) > move_index and parts[move_index] == "moves":
            for move in parts[move_index + 1:]:
                self.board.push(chess.Move.from_uci(move))

    def go(self, command: str) -> None:
        """Search for the best move and respond with 'bestmove'"""

        # Parse go command parameters
        options: dict[str, float | int | bool] = {}
        parts: list[str] = command.split(" ")
        i: int = 1
        while i < len(parts):
            if parts[i] in ['wtime', 'btime', 'winc', 'binc', 'movestogo',
                           'depth', 'nodes', 'mate', 'movetime']:
                if i + 1 < len(parts):
                    try:
                        # Convert time values from milliseconds to seconds for wtime/btime
                        if parts[i] in ['wtime', 'btime', 'winc', 'binc', 'movetime']:
                            options[parts[i]] = int(parts[i + 1]) / 1000.0  # Convert ms to seconds
                        else:
                            options[parts[i]] = int(parts[i + 1])
                        i += 2
                    except ValueError:
                        i += 1
                else:
                    i += 1
            elif parts[i] in ['infinite', 'ponder']:
                options[parts[i]] = True
                i += 1
            else:
                i += 1

        # Get time left for current player (default to 20 seconds)
        time_left_value = (
            options.get('movetime') or
            options.get('wtime' if self.board.turn == chess.WHITE else 'btime') or
            20.0
        )
        time_left = float(time_left_value)

        # Send initial info about search parameters
        print(f"info string Starting search with {self.max_attempts} attempts")
        print(f"info string Time budget: {time_left:.2f}s")
        print(f"info string Panic mode threshold: {self.panic_mode_threshold:.2f}s")

        # This is where the move selection logic gets called
        best_move: str = self.select_move(time_left)
        print(f"bestmove {best_move}")

    def select_move(self, time_left: float) -> str:
        """
        This is the function to implement with your chess logic.
        It should return a move in UCI format (e.g., "e2e4") or "(none)".

        Available data:
        - self.board: A chess.Board object representing the current position
        - self.board.legal_moves: Generator of legal moves

        Args:
            time_left (float): Time left in seconds for this move

        Returns:
            str: A move in UCI format (e.g., "e2e4") or "(none)"
        """

        legal_moves: list[chess.Move] = list(self.board.legal_moves)
        if not legal_moves:
            print("info string No legal moves available")
            return "(none)"  # No legal moves

        if len(legal_moves) == 1:
            # If there is only one legal move, we can return it immediately
            only_move: str = legal_moves[0].uci()
            print(f"info string Only one legal move available: {only_move}")
            print(f"info pv {only_move}")
            return only_move

        # If we really have very little time left
        CRAZY_PANIC_MODE_THRESHOLD: float = 3.0
        if time_left <= CRAZY_PANIC_MODE_THRESHOLD:
            print("info string No time left, first alphabetical legal move instead")
            # During data analysis, we noticed that the first UCI move is very
            # slightly better than a random move, for some reasons.
            # Still terrible though.
            fallback_move: chess.Move = min(legal_moves, key=lambda move: move.uci())
            print(f"info pv {fallback_move.uci()}")
            return fallback_move.uci()

        board_unicode: str = board_to_unicode(self.board)
        print(f"info string Legal moves available: {len(legal_moves)}")

        # Record start time for timer tracking
        start_time: float = time.time()

        # Define compute_next_move function for the hybrid engine
        def compute_next_move() -> str:
            # Check current elapsed time
            elapsed_time: float = time.time() - start_time
            remaining_time: float = time_left - elapsed_time

            # Check if we're in panic mode or no-LLM mode
            in_panic_mode: bool = remaining_time <= self.panic_mode_threshold

            if self.no_llm or in_panic_mode:
                mode_reason = ("NoLLM mode enabled" if self.no_llm
                              else f"Panic mode (remaining: {remaining_time:.2f}s < {self.panic_mode_threshold:.2f}s)")
                print(f"info string {mode_reason} - selecting random move instead of using LLM")
                random_move: str = random.choice(legal_moves).uci()
                print(f"info string Random move selected: {random_move}")
                return random_move
            else:
                explanation: str = analyze_chess_position(self.board)

                legal_uci_moves: list[str] = [move.uci() for move in legal_moves]

                best_move: str = ask_for_a_move(
                    board_analyse=explanation,
                    board_unicode=board_unicode,
                    legal_moves=legal_uci_moves,
                )
                print(f"info string AI selected move: {best_move}")
                return best_move

        # Use the hybrid engine to select the move with max attempts from settings
        selected_move: str = self.hybrid_engine(
            self.board, compute_next_move, max_attempts=self.max_attempts
        )
        print(f"info string Final move selected: {selected_move}")
        return selected_move

    def set_option(self, command: str) -> None:
        """Handle UCI setoption commands"""
        parts: list[str] = command.split(" ")

        if len(parts) < 5 or parts[1] != "name":
            print("info string Invalid setoption command format")
            return

        option_name = parts[2]
        if len(parts) >= 5 and parts[3] == "value":
            option_value: str = " ".join(parts[4:])
        else:
            print(f"info string Invalid setoption command: missing value for {option_name}")
            return

        if option_name == "MaxAttempts":
            try:
                value: int = int(option_value)
                if 1 <= value <= 20:
                    self.max_attempts = value
                    print(f"info string MaxAttempts set to {value}")
                else:
                    print("info string MaxAttempts must be between 1 and 20")
            except ValueError:
                print(f"info string Invalid value for MaxAttempts: {option_value}")
        elif option_name == "NoLLM":
            if option_value.lower() in ['true', '1', 'yes']:
                self.no_llm = True
                print("info string NoLLM enabled - using random moves instead of LLM")
            elif option_value.lower() in ['false', '0', 'no']:
                self.no_llm = False
                print("info string NoLLM disabled - using LLM for move selection")
            else:
                print(f"info string Invalid value for NoLLM: {option_value}")
        elif option_name == "PanicModeThreshold":
            try:
                value = int(option_value)  # Value comes in seconds
                if 1 <= value <= 60:
                    self.panic_mode_threshold = float(value)
                    print(f"info string PanicModeThreshold set to {self.panic_mode_threshold:.1f}s")
                else:
                    print("info string PanicModeThreshold must be between 1 and 60 seconds")
            except ValueError:
                print(f"info string Invalid value for PanicModeThreshold: {option_value}")
        else:
            print(f"info string Unknown option: {option_name}")

    def run(self) -> None:
        """Main loop to process UCI commands"""
        while True:
            try:
                line: str = input().strip()

                if line == "uci":
                    self.uci()
                elif line == "isready":
                    self.is_ready()
                elif line.startswith("position"):
                    self.set_position(line)
                elif line.startswith("go"):
                    self.go(line)
                elif line == "quit" or line == "exit":
                    self.stop()
                    return
                elif line == "ponderhit":
                    print("info string Ponder hit, but not implemented in this engine.")
                elif line == "ucinewgame":
                    self.board = chess.Board()
                    print("info string New game started.")
                elif line.startswith("setoption"):
                    self.set_option(line)
                elif line.startswith("register"):
                    print("info string Register command received, but not implemented in this engine.")
                elif line.startswith("debug"):
                    if line == "debug on":
                        self.debug = True
                        print("info string Debug mode enabled.")
                    elif line == "debug off":
                        self.debug = False
                        print("info string Debug mode disabled.")
                else:
                    print(f"info string Unknown command: {line}")

            except EOFError:
                break
            except Exception as e:
                # Get the last line of the traceback for context
                error_msg: str = str(e).replace('\n', ' ').replace('\r', ' ').replace('\t', ' ').replace('"', "'")
                clean_error: str = ''.join(c for c in error_msg if ord(c) >= 32)[:200]
                print(f"info string Error: {clean_error}")

                # Full details to stderr
                print(f"Error: {e}", file=sys.stderr)
                traceback.print_exc(file=sys.stderr)
            finally:
                sys.stdout.flush()


def main() -> None:
    engine: ChessEngine = ChessEngine()
    engine.run()


if __name__ == "__main__":
    main()

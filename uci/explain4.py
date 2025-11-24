from __future__ import annotations

import random
from typing import Dict, List, Optional, Set

import chess


class ChessMoveAnalyzer:
    def __init__(self, board: chess.Board) -> None:
        """Initialize with a chess board position."""
        self.board: chess.Board = board
        self.piece_names: Dict[int, str] = {
            chess.PAWN: "pawn",
            chess.KNIGHT: "knight",
            chess.BISHOP: "bishop",
            chess.ROOK: "rook",
            chess.QUEEN: "queen",
            chess.KING: "king",
        }
        self.piece_values: Dict[int, int] = {
            chess.PAWN: 1,
            chess.KNIGHT: 3,
            chess.BISHOP: 3,
            chess.ROOK: 5,
            chess.QUEEN: 9,
            chess.KING: 1000,
        }

    def get_human_readable_move(self, move: chess.Move) -> str:
        """Convert a chess.Move to human-readable text."""
        moving_piece: Optional[chess.Piece] = self.board.piece_at(move.from_square)
        if moving_piece is None:
            return move.uci()

        piece_name: str = self.piece_names[moving_piece.piece_type]
        from_sq: str = chess.square_name(move.from_square)
        to_sq: str = chess.square_name(move.to_square)
        description: str = f"{piece_name} from {from_sq} to {to_sq}"

        if self.board.is_capture(move):
            captured: Optional[chess.Piece] = self.board.piece_at(move.to_square)
            if captured:
                captured_piece_name: str = self.piece_names[captured.piece_type]
                description = (
                    f"{piece_name} from {from_sq} takes {captured_piece_name} at {to_sq}"
                )
            else:
                description = (
                    f"{piece_name} from {from_sq} takes pawn at {to_sq} (en passant)"
                )

        if move.promotion:
            promoted_piece: str = self.piece_names[move.promotion]
            description += f" promoting to {promoted_piece}"

        if self.board.is_castling(move):
            if move.to_square > move.from_square:
                description = "Kingside castle (O-O)"
            else:
                description = "Queenside castle (O-O-O)"

        temp_board: chess.Board = self.board.copy()
        temp_board.push(move)
        if temp_board.is_check():
            if temp_board.is_checkmate():
                description += " (checkmate)"
            else:
                description += " (check)"

        return description

    def analyze_capture(self, move: chess.Move) -> str:
        """
        Analyze the tactical nature of a capture.

        Returns:
            str: One of "free grab", "worth the investment", "exchange",
            "sacrifice", or an empty string if not applicable.
        """
        if not self.board.is_capture(move):
            return ""

        capturing_piece: Optional[chess.Piece] = self.board.piece_at(move.from_square)
        captured_piece: Optional[chess.Piece] = self.board.piece_at(move.to_square)

        if self.board.is_en_passant(move):
            captured_piece = chess.Piece(chess.PAWN, not self.board.turn)

        if capturing_piece is None or captured_piece is None:
            return ""

        capturing_value: int = self.piece_values[capturing_piece.piece_type]
        captured_value: int = self.piece_values[captured_piece.piece_type]

        temp_board: chess.Board = self.board.copy()
        temp_board.push(move)

        is_at_risk: bool = bool(
            temp_board.attackers(not self.board.turn, move.to_square)
        )

        if not is_at_risk:
            return "free grab"
        if captured_value > capturing_value:
            return "worth the investment"
        if captured_value == capturing_value:
            return "exchange"
        return "sacrifice"

    def analyse_move_risk(self, move: chess.Move) -> str:
        """
        Analyse a move to determine if it's risky or safe.

        Returns:
            str: "sacrifice", "risky", or an empty string if safe.
        """
        origin_piece: Optional[chess.Piece] = self.board.piece_at(move.from_square)
        if origin_piece is None:
            return ""

        temp_board: chess.Board = self.board.copy()
        temp_board.push(move)

        is_at_risk: bool = bool(
            temp_board.attackers(not self.board.turn, move.to_square)
        )

        if is_at_risk:
            if origin_piece.piece_type == chess.QUEEN:
                return "sacrifice"
            return "risky"

        return ""

    def analyze_pieces_at_risk(self) -> List[str]:
        """Identify pieces under threat and why."""
        risks: List[str] = []
        for square in chess.SQUARES:
            piece: Optional[chess.Piece] = self.board.piece_at(square)
            if piece is None or piece.color != self.board.turn:
                continue

            attackers: chess.SquareSet = self.board.attackers(
                not self.board.turn, square
            )
            if not attackers:
                continue

            piece_name: str = self.piece_names[piece.piece_type]
            square_name: str = chess.square_name(square)

            defenders: chess.SquareSet = self.board.attackers(self.board.turn, square)
            if square in defenders:
                defenders.remove(square)

            attacking_pieces: List[str] = []
            for attacker_square in attackers:
                attacker = self.board.piece_at(attacker_square)
                if attacker is None:
                    continue
                attacker_name: str = self.piece_names[attacker.piece_type]
                attacker_pos: str = chess.square_name(attacker_square)
                attacking_pieces.append(f"{attacker_name} at {attacker_pos}")

            status: str = (
                "undefended"
                if not defenders
                else f"defended by {len(defenders)} piece(s)"
            )
            risks.append(
                f"- {piece_name} at {square_name} is under threat from: "
                f"{', '.join(attacking_pieces)} ({status})"
            )

        return risks

    def analyze_legal_moves(self) -> str:
        """
        Analyze all legal moves and return a markdown-formatted report.
        """
        moves_by_category: Dict[str, List[str]] = {
            "Captures": [],
            "Checks": [],
            "Castle": [],
            "Promotions": [],
            "Defensive Moves": [],
            "Developing Moves": [],
            "Other Moves": [],
        }

        pieces_under_attack: Set[int] = set()
        for square in chess.SQUARES:
            piece: Optional[chess.Piece] = self.board.piece_at(square)
            if piece and piece.color == self.board.turn:
                if self.board.attackers(not self.board.turn, square):
                    pieces_under_attack.add(square)

        for move in self.board.legal_moves:
            uci: str = move.uci()
            human_desc: str = self.get_human_readable_move(move)
            move_entry: str = f"`{uci}` - {human_desc}"

            annotation: str = ""
            if self.board.is_capture(move):
                annotation = self.analyze_capture(move)
            else:
                annotation = self.analyse_move_risk(move)
            if annotation:
                move_entry += f" [{annotation}]"

            if self.board.is_castling(move):
                moves_by_category["Castle"].append(move_entry)
            elif move.promotion:
                moves_by_category["Promotions"].append(move_entry)
            elif self.board.is_capture(move):
                moves_by_category["Captures"].append(move_entry)
            elif move.from_square in pieces_under_attack:
                moves_by_category["Defensive Moves"].append(move_entry)
            else:
                temp_board: chess.Board = self.board.copy()
                temp_board.push(move)
                if temp_board.is_check():
                    moves_by_category["Checks"].append(move_entry)
                elif self.is_developing_move(move):
                    moves_by_category["Developing Moves"].append(move_entry)
                else:
                    moves_by_category["Other Moves"].append(move_entry)

        md_output: List[str] = []

        md_output.append(
            f"## Current Turn: {'White' if self.board.turn else 'Black'}\n"
        )

        risks: List[str] = self.analyze_pieces_at_risk()
        if risks:
            md_output.append("## Pieces Under Threat\n")
            random.shuffle(risks)
            md_output.extend(risks)
            md_output.append("")

        md_output.append("## Legal Moves Analysis\n")

        categories_order: List[str] = [
            "Captures",
            "Checks",
            "Castle",
            "Promotions",
            "Defensive Moves",
            "Developing Moves",
            "Other Moves",
        ]

        for category in categories_order:
            moves: List[str] = moves_by_category[category]
            if moves:
                md_output.append(f"### {category}\n")
                random.shuffle(moves)
                md_output.extend(moves)
                md_output.append("")

        return "\n".join(md_output)

    def is_developing_move(self, move: chess.Move) -> bool:
        """Check if a move is a developing move (moving a piece from home rank)."""
        piece: Optional[chess.Piece] = self.board.piece_at(move.from_square)
        if piece is None:
            return False

        if piece.piece_type == chess.PAWN:
            return False

        from_rank: int = chess.square_rank(move.from_square)
        if piece.color == chess.WHITE and from_rank == 0:
            return True
        if piece.color == chess.BLACK and from_rank == 7:
            return True

        return False


def analyze_chess_position(board: chess.Board) -> str:
    """Wrapper function to analyze a chess position."""
    analyzer: ChessMoveAnalyzer = ChessMoveAnalyzer(board)
    return analyzer.analyze_legal_moves()

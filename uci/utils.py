import chess


def board_to_unicode(board: chess.Board) -> str:
    """
    Convert a chess board to a Unicode string representation.

    Args:
        board: chess.Board object

    Returns:
        str: Unicode representation of the board
    """
    unicode_pieces: dict[int, tuple[str, str]] = {
        chess.PAWN: ('♙', '♟'),
        chess.ROOK: ('♖', '♜'),
        chess.KNIGHT: ('♘', '♞'),
        chess.BISHOP: ('♗', '♝'),
        chess.QUEEN: ('♕', '♛'),
        chess.KING: ('♔', '♚'),
    }

    board_str = ""
    for rank in range(7, -1, -1):
        board_str += str(rank + 1) + " "
        for file in range(8):
            piece = board.piece_at(chess.square(file, rank))
            if piece:
                color_index = 1 if piece.color == chess.BLACK else 0
                symbol = unicode_pieces[piece.piece_type][color_index]
            else:
                symbol = '·'
            board_str += symbol + " "
        board_str += "\n"
    board_str += "  a b c d e f g h\n"
    return board_str

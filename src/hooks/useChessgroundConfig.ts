import { useMemo } from 'react';
import type { Config } from 'chessground/config';
import useChessStore from '../stores/chessStore';

export const useChessgroundConfig = (): Config => {
  const { chess, playerColor, isPlayerTurn, legalMoves, rewindMode, lastMoveSquares } = useChessStore();

  return useMemo((): Config => {
    // Use rewind FEN when in rewind mode, otherwise use current game FEN
    const displayFen = rewindMode?.active ? rewindMode.fen : chess.fen();

    // Player can only move when it's their turn AND not in rewind mode
    const canMove = isPlayerTurn && !rewindMode?.active;
    const activeLastMove = rewindMode?.active ? rewindMode.lastMoveSquares : lastMoveSquares;
    const lastMove = activeLastMove ?? undefined;

    return {
      fen: displayFen,
      orientation: playerColor,
      turnColor: chess.turn() === 'w' ? 'white' : 'black',
      movable: {
        color: canMove ? playerColor : undefined,
        free: false,
        dests: canMove ? legalMoves : new Map(),
      },
      check: chess.isCheck(),
      lastMove,
      highlight: {
        lastMove: true,
        check: true,
      },
      animation: {
        enabled: true,
        duration: 200,
      },
      coordinates: false,
    };
  }, [chess, playerColor, isPlayerTurn, legalMoves, rewindMode, lastMoveSquares]);
};

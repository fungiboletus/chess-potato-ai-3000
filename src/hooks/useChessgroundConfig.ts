import { useMemo } from 'react';
import type { Config } from 'chessground/config';
import useChessStore from '../stores/chessStore';

export const useChessgroundConfig = (): Config => {
  const { chess, playerColor, isPlayerTurn, legalMoves } = useChessStore();

  return useMemo((): Config => ({
    fen: chess.fen(),
    orientation: playerColor,
    turnColor: chess.turn() === 'w' ? 'white' : 'black',
    movable: {
      color: isPlayerTurn ? playerColor : undefined,
      free: false,
      dests: isPlayerTurn ? legalMoves : new Map(),
    },
    check: chess.isCheck(),
    highlight: {
      lastMove: true,
      check: true,
    },
    animation: {
      enabled: true,
      duration: 200,
    },
    coordinates: false,
  }), [chess, playerColor, isPlayerTurn, legalMoves]);
};

import useChessStore from '../stores/chessStore';

export const useChessDebug = () => {
  const store = useChessStore();
  
  // Log current state to console
  const logState = () => {
    console.group('Chess Game State');
    console.log('Game State:', store.gameState);
    console.log('Player Color:', store.playerColor);
    console.log('Is Player Turn:', store.isPlayerTurn);
    console.log('Game Started:', store.gameStarted);
    console.log('Move History:', store.moveHistory);
    console.log('FEN:', store.chess.fen());
    console.log('Turn:', store.chess.turn());
    console.log('Is Check:', store.chess.isCheck());
    console.log('Is Checkmate:', store.chess.isCheckmate());
    console.log('Is Game Over:', store.chess.isGameOver());
    console.log('Legal Moves:', Array.from(store.legalMoves.entries()));
    console.groupEnd();
  };

  return {
    logState,
    ...store
  };
};

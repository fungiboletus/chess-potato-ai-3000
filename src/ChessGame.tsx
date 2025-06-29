import React from 'react';
import { ChessGameWindow } from './components/ChessGameWindow';
import { MoveHistoryWindow } from './components/MoveHistoryWindow';
import { GameResultWindow } from './components/GameResultWindow';
import { HelpWindow } from './components/HelpWindow';
import useChessStore from './stores/chessStore';

export const ChessGame: React.FC = () => {
  const {
    showMoveHistory,
    showHelp,
    gameResult,
    moveHistory,
    setShowMoveHistory,
    setShowHelp,
    closeGameResult,
  } = useChessStore();

  return (
    <div className="chess-game">
      <div className="main-window-container">
        <ChessGameWindow />
      </div>

      <MoveHistoryWindow
        isOpen={showMoveHistory}
        onClose={() => setShowMoveHistory(false)}
        moveHistory={moveHistory}
      />

      <GameResultWindow
        isOpen={!!gameResult}
        onClose={closeGameResult}
        result={gameResult?.type || 'draw'}
        message={gameResult?.message || ''}
      />

      <HelpWindow
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
      />
    </div>
  );
};

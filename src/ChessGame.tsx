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
    showHelpLast,
    gameResult,
    moveHistory,
    setShowMoveHistory,
    setShowHelp,
    setShowHelpLast,
    closeGameResult,
  } = useChessStore();

  const windowComponents = [
    <MoveHistoryWindow
      key="moveHistory"
      isOpen={showMoveHistory}
      onClose={() => setShowMoveHistory(false)}
      onMouseDown={() => setShowHelpLast(false)}
      moveHistory={moveHistory}
    />,
    <HelpWindow
      key="help"
      isOpen={showHelp}
      onClose={() => setShowHelp(false)}
      onMouseDown={() => setShowHelpLast(true)}
    />,
  ];

  console.log(showHelpLast);
  // Order windows based on which was shown last - most recent on top
  const orderedWindows = showHelpLast ? windowComponents : windowComponents.reverse();
  console.log(orderedWindows);

  return (
    <div className="chess-game">
      <div className="main-window-container">
        <ChessGameWindow />
      </div>

      {orderedWindows}

      <GameResultWindow
        isOpen={!!gameResult}
        onClose={closeGameResult}
        result={gameResult?.type || 'draw'}
        message={gameResult?.message || ''}
      />

    </div>
  );
};

import React from 'react';
import { ChessGameWindow } from './components/ChessGameWindow';
import { MoveHistoryWindow } from './components/MoveHistoryWindow';
import { GameResultWindow } from './components/GameResultWindow';
import { HelpWindow } from './components/HelpWindow';
import { LanguageWindow } from './components/LanguageWindow';
import { GameEnginesWindow } from './components/GameEnginesWindow';
import useChessStore from './stores/chessStore';

export const ChessGame: React.FC = () => {
  const {
    showMoveHistory,
    showHelp,
    showHelpLast,
    showLanguageWindow,
    showEngineWindow,
    gameResult,
    moveHistory,
    setShowMoveHistory,
    setShowHelp,
    setShowHelpLast,
    setShowLanguageWindow,
    setShowEngineWindow,
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

  // Order windows based on which was shown last - most recent on top
  const orderedWindows = showHelpLast ? windowComponents : windowComponents.reverse();

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

      <LanguageWindow
        isOpen={showLanguageWindow}
        onClose={() => setShowLanguageWindow(false)}
      />

      <GameEnginesWindow
        isOpen={showEngineWindow}
        onClose={() => setShowEngineWindow(false)}
      />

    </div>
  );
};

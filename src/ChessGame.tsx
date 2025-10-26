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
    showLanguageWindow,
    showEngineWindow,
    gameResult,
    moveHistory,
    windowStack,
    setShowMoveHistory,
    setShowHelp,
    setShowLanguageWindow,
    setShowEngineWindow,
    closeGameResult,
  } = useChessStore();

  // Calculate z-index for a window based on its position in the stack
  const getZIndex = (windowId: string): number => {
    const BASE_Z_INDEX = 100;
    const index = windowStack.indexOf(windowId);
    // Windows not in stack get base z-index
    // Windows in stack get base + position + 1 (so first clicked window gets 101)
    return index >= 0 ? BASE_Z_INDEX + index + 1 : BASE_Z_INDEX;
  };

  return (
    <div className="chess-game">
      <div className="main-window-container">
        <ChessGameWindow />
      </div>

      <MoveHistoryWindow
        isOpen={showMoveHistory}
        onClose={() => setShowMoveHistory(false)}
        moveHistory={moveHistory}
        windowId="moveHistory"
        zIndex={getZIndex('moveHistory')}
      />

      <HelpWindow
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
        windowId="help"
        zIndex={getZIndex('help')}
      />

      <GameResultWindow
        isOpen={!!gameResult}
        onClose={closeGameResult}
        result={gameResult?.type || 'draw'}
        message={gameResult?.message || ''}
        windowId="gameResult"
        zIndex={getZIndex('gameResult')}
      />

      <LanguageWindow
        isOpen={showLanguageWindow}
        onClose={() => setShowLanguageWindow(false)}
        windowId="language"
        zIndex={getZIndex('language')}
      />

      <GameEnginesWindow
        isOpen={showEngineWindow}
        onClose={() => setShowEngineWindow(false)}
        windowId="engine"
        zIndex={getZIndex('engine')}
      />

    </div>
  );
};

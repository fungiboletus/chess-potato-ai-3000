import React from 'react';
import { ChessBoard } from './ChessBoard';
import { AnimatedProgressBar } from './components/AnimatedProgressBar';
import { MoveHistoryWindow } from './components/MoveHistoryWindow';
import { GameResultWindow } from './components/GameResultWindow';
import { HelpWindow } from './components/HelpWindow';
import { DebugPanel } from './components/DebugPanel';
import useChessStore from './stores/chessStore';

export const ChessGame: React.FC = () => {
  const {
    playerColor,
    gameStatus,
    gameState,
    moveHistory,
    gameStarted,
    showMoveHistory,
    showHelp,
    gameResult,
    resetGame,
    resignGame,
    setShowMoveHistory,
    setShowHelp,
    closeGameResult,
  } = useChessStore();

  const isAIThinking = gameState === 'ai_thinking';

  return (
    <div className="draggable-window-container">
      <DebugPanel />
      <div className="window" style={{ width: '100%', maxWidth: '600px', margin: '0 auto' }}>
        <div className="title-bar">
          <div className="title-bar-text">Chess Potato AI 3000</div>
        </div>
        <div className="window-body">
          <div className="chess-container">
            <div className="progress-container">
              <div className={`ai-thinking-container ${isAIThinking ? 'visible' : 'hidden'}`}>
                <span>
                  🤖 AI is thinking...
                </span>
                <AnimatedProgressBar isVisible={isAIThinking} width="100%" />
              </div>
            </div>

            <div className="chess-board-wrapper">
              <ChessBoard />
            </div>

            <div className="game-controls">
              <button onClick={resetGame}>New Game</button>
              <button onClick={resignGame} disabled={!gameStarted}>
                Resign
              </button>
              <button onClick={() => setShowMoveHistory(true)}>
                Show Moves
              </button>
              <button onClick={() => setShowHelp(true)}>
                Help
              </button>
            </div>
          </div>
        </div>
        <div className="status-bar">
          <p className="status-bar-field">Playing as: {playerColor}</p>
          <p className="status-bar-field">{gameStatus}</p>
          <p className="status-bar-field">Moves: {moveHistory.length}</p>
        </div>
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

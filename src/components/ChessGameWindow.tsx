import React from 'react';
import { ChessBoard } from '../ChessBoard';
import { AnimatedProgressBar } from './AnimatedProgressBar';
import useChessStore from '../stores/chessStore';
import { DraggableWindow } from './DraggableWindow';

export const ChessGameWindow: React.FC = () => {
  const {
    playerColor,
    gameStatus,
    gameState,
    moveHistory,
    gameStarted,
    resetGame,
    resignGame,
    setShowMoveHistory,
    setShowHelp,
    redrawChessground,
  } = useChessStore();

  const isAIThinking = gameState === 'ai_thinking';

  const statusBarContent = (
    <>
      <p className="status-bar-field">Playing as: {playerColor}</p>
      <p className="status-bar-field">{gameStatus}</p>
      <p className="status-bar-field">Moves: {moveHistory.length}</p>
    </>
  );

  return (
    <DraggableWindow
      title="Chess Potato AI 3000"
      isOpen={true}
      statusBar={statusBarContent}
      onDragStop={redrawChessground}
    >
      <div className="chess-game-main-window">
        <div className="chess-container">
          <div className="chess-header">
            <img src="./public/art.png" alt="" className="pixelated" />
            <div className="progress-container">
              <div className={`ai-thinking-container`} style={{ visibility: isAIThinking ? 'visible' : 'hidden' }}>
                <p>
                  Chess Potato AI 3000 is thinking...
                </p>
                <AnimatedProgressBar isVisible={isAIThinking} width="100%" />
              </div>
            </div>
          </div>

          <div className="chess-board-wrapper">
            <ChessBoard />
          </div>

          <div className="game-controls">
            <button onClick={resetGame} disabled={gameStarted && gameState !== 'game_over'}>
              New Game
            </button>
            <button onClick={resignGame} disabled={!gameStarted || gameState === 'game_over'}>
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
    </DraggableWindow>
  );
};

import React from 'react';
import { useTranslation } from 'react-i18next';
import { ChessBoard } from '../ChessBoard';
import { AnimatedProgressBar } from './AnimatedProgressBar';
import { GameEngineButton } from './GameEngineButton';
import useChessStore from '../stores/chessStore';
import { useGameStatus } from '../hooks/useGameStatus';
import { DraggableWindow } from './DraggableWindow';

export const ChessGameWindow: React.FC = () => {
  const { t } = useTranslation();
  const gameStatus = useGameStatus();

  const {
    playerColor,
    gameState,
    moveHistory,
    gameStarted,
    selectedEngine,
    engineFetchState,
    rewindMode,
    resetGame,
    resignGame,
    setShowMoveHistory,
    setShowHelp,
    setShowLanguageWindow,
    setShowEngineWindow,
    redrawChessground,
    getSelectedEngineDisplayName,
  } = useChessStore();

  const isAIThinking = gameState === 'ai_thinking';

  // Get engine display name and create window title
  const engineDisplayName = getSelectedEngineDisplayName();
  const windowTitle = selectedEngine && selectedEngine !== 'chess-potato-ai-3000'
    ? `${t('game.title')} - ${engineDisplayName} Edition`
    : t('game.title');

  const statusBarContent = rewindMode?.active ? (
    <p className="status-bar-field" style={{ flex: 1 }}>
      {t('status.review_mode')}
    </p>
  ) : (
    <>
      <p className="status-bar-field">{t('game.playing_as', { color: t(`colors.${playerColor}`) })}</p>
      <p className="status-bar-field">{gameStatus}</p>
      <p className="status-bar-field">{t('game.moves', { count: moveHistory.length })}</p>
    </>
  );

  return (
    <DraggableWindow
      title={windowTitle}
      isOpen={true}
      statusBar={statusBarContent}
      onDragStop={redrawChessground}
    >
      <div className="chess-game-main-window">
        <div className="chess-container">
          <div className="chess-header">
            <GameEngineButton
              isAIThinking={isAIThinking}
              engineFetchState={engineFetchState}
              selectedEngine={selectedEngine}
              onClick={() => setShowEngineWindow(true)}
            />
            <div className="progress-container">
              <div className={`ai-thinking-container`} style={{ visibility: isAIThinking ? 'visible' : 'hidden' }}>
                <p>
                  {t('game.thinking', { engineName: engineDisplayName })}
                </p>
                <AnimatedProgressBar isVisible={isAIThinking} width="100%" key={moveHistory.length << 1 + (isAIThinking ? 1 : 0)} />
              </div>
            </div>

          </div>

          <div className="chess-board-wrapper">
            <ChessBoard />
          </div>

          <div className="game-controls">
            <button onClick={resetGame} disabled={gameStarted && gameState !== 'game_over'}>
              {t('game.new_game')}
            </button>
            <button onClick={resignGame} disabled={gameState === 'initializing' || gameState === 'game_over'}>
              {t('game.resign')}
            </button>
            <button onClick={() => setShowMoveHistory(true)}>
              {t('game.show_moves')}
            </button>
            <button onClick={() => setShowHelp(true)}>
              {t('game.help')}
            </button>
            <button
              onClick={() => setShowLanguageWindow(true)}
              title={t('language.select')}
              className="language-button"
            >
              <img src="/world.png" alt="" height="16" width="16" />
              {t('language.lang')}
            </button>
          </div>
        </div>
      </div>
    </DraggableWindow>
  );
};

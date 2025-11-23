import React from 'react';
import { useTranslation } from 'react-i18next';
import { ChessBoard } from '../ChessBoard';
import { ChessHeader } from './ChessHeader';
import { GameControls } from './GameControls';
import useChessStore from '../stores/chessStore';
import { useGameStatus } from '../hooks/useGameStatus';
import { DraggableWindow } from './DraggableWindow';

export const ChessGameWindow: React.FC = () => {
  const { t } = useTranslation();
  const gameStatus = useGameStatus();

  const {
    playerColor,
    moveHistory,
    selectedEngine,
    rewindMode,
    redrawChessground,
    getSelectedEngineDisplayName,
  } = useChessStore();

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
          <ChessHeader />

          <div className="chess-board-wrapper">
            <ChessBoard />
          </div>

          <GameControls />
        </div>
      </div>
    </DraggableWindow>
  );
};

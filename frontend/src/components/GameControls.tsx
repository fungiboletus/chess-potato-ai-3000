import React from 'react';
import { useTranslation } from 'react-i18next';
import useChessStore from '../stores/chessStore';

export const GameControls: React.FC = () => {
  const { t } = useTranslation();

  const {
    gameStarted,
    gameState,
    resetGame,
    resignGame,
    setShowMoveHistory,
    setShowHelp,
    setShowLanguageWindow,
  } = useChessStore();

  return (
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
  );
};

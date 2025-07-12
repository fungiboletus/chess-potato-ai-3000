import React from 'react';
import { useTranslation } from 'react-i18next';
import { DraggableWindow } from './DraggableWindow';

interface GameResultWindowProps {
  isOpen: boolean;
  onClose: () => void;
  result: 'win' | 'lose' | 'draw';
  message: string;
}

export const GameResultWindow: React.FC<GameResultWindowProps> = ({
  isOpen,
  onClose,
  result,
  message,
}) => {
  const { t } = useTranslation();

  const getResultConfig = () => {
    switch (result) {
      case 'win':
        return {
          title: t('game.victory'),
          gifPlaceholder: t('result.winner'),
        };
      case 'lose':
        return {
          title: t('game.defeat'),
          gifPlaceholder: t('result.game_over'),
        };
      case 'draw':
        return {
          title: t('game.draw'),
          gifPlaceholder: t('result.tie'),
        };
    }
  };

  const config = getResultConfig();

  // Calculate center position more safely
  const getCenterPosition = () => {
    const windowWidth = 350; // estimated window width
    const windowHeight = 280; // estimated window height
    return {
      x: Math.max(0, (window.innerWidth - windowWidth) / 2),
      y: Math.max(0, (window.innerHeight - windowHeight) / 2)
    };
  };

  return (
    <DraggableWindow
      title={config.title}
      isOpen={isOpen}
      onClose={onClose}
      defaultPosition={getCenterPosition()}
      className="game-result-window"
    >
      <div className={`game-result-content ${result}`}>
        {/* Placeholder for GIF */}
        <div className="game-result-gif-placeholder">
          {config.gifPlaceholder}
          <small>
            {t('result.gif_placeholder')}
          </small>
        </div>

        <div className="game-result-message">
          {message}
        </div>

        <button
          onClick={onClose}
          className="game-result-button"
        >
          {t('game.close')}
        </button>
      </div>
    </DraggableWindow>
  );
};

import React from 'react';
import { useTranslation } from 'react-i18next';
import type { EngineFetchState } from '../stores/chessStore';

interface GameEngineButtonProps {
  isAIThinking: boolean;
  engineFetchState: EngineFetchState;
  selectedEngine: string | null;
  engineLocked: boolean;
  onClick: () => void;
}

// Map engine names to their icon paths
const getEngineIcon = (engineName: string | null): string => {
  if (!engineName) return './icons/engine-default.png';

  switch (engineName) {
    case 'chess-potato-ai-3000':
      return './icons/engine-potato.png';
    case 'alphabet':
      return './icons/engine-alphabet.png';
    case 'stockfish_level_0':
    case 'stockfish_default':
    case 'stockfish_unbeatable':
      return './icons/engine-stockfish.png';
    case 'offline-random':
      return './icons/engine-offline.png';
    default:
      return './icons/engine-generic.png';
  }
};

export const GameEngineButton: React.FC<GameEngineButtonProps> = ({
  isAIThinking,
  engineFetchState,
  selectedEngine,
  engineLocked,
  onClick
}) => {
  const { t } = useTranslation();

  // Determine which icon to display
  let iconSrc: string;

  if (isAIThinking) {
    // AI is thinking - show thinking animation
    iconSrc = './art.apng';
  } else if (engineFetchState === 'loading') {
    // Loading engines - show loading animation
    iconSrc = './icons/engine-loading.apng';
  } else if (engineFetchState === 'error') {
    // Failed to load engines - show error icon
    iconSrc = './icons/engine-error.png';
  } else {
    // Success - show engine-specific icon
    iconSrc = getEngineIcon(selectedEngine);
  }

  // Determine button title
  const title = engineLocked
    ? t('engine.locked_tooltip', { engine: selectedEngine || 'Engine' })
    : selectedEngine || 'Select Engine';

  return (
    <button
      className="game-engine-button"
      disabled={isAIThinking || engineLocked}
      onClick={onClick}
      type="button"
      title={title}
    >
      <img
        src={iconSrc}
        alt={selectedEngine || 'Engine'}
        className="pixelated"
      />
    </button>
  );
};

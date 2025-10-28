import React from 'react';
import { useTranslation } from 'react-i18next';
import { GameEngineButton } from './GameEngineButton';
import { AnimatedProgressBar } from './AnimatedProgressBar';
import useChessStore from '../stores/chessStore';

export const ChessHeader: React.FC = () => {
  const { t } = useTranslation();

  const {
    gameState,
    engineFetchState,
    selectedEngine,
    engineLocked,
    moveHistory,
    setShowEngineWindow,
    setShowThemeWindow,
    getSelectedEngineDisplayName,
  } = useChessStore();

  const isAIThinking = gameState === 'ai_thinking';
  const engineDisplayName = getSelectedEngineDisplayName();

  return (
    <div className="chess-header">
      <GameEngineButton
        isAIThinking={isAIThinking}
        engineFetchState={engineFetchState}
        selectedEngine={selectedEngine}
        engineLocked={engineLocked}
        onClick={() => setShowEngineWindow(true)}
      />
      <div className="top-right-buttons">
        <button onClick={() => setShowThemeWindow(true)}>
          {t('game.change_theme')}
        </button>
      </div>
      <div className="progress-container">
        <div className={`ai-thinking-container`} style={{ visibility: isAIThinking ? 'visible' : 'hidden' }}>
          <p>
            {t('game.thinking', { engineName: engineDisplayName })}
          </p>
          <AnimatedProgressBar isVisible={isAIThinking} width="100%" key={moveHistory.length << 1 + (isAIThinking ? 1 : 0)} />
        </div>
      </div>
    </div>
  );
};

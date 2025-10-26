import React from 'react';
import { useTranslation } from 'react-i18next';
import { DraggableWindow } from './DraggableWindow';
import useChessStore, { OFFLINE_ENGINE } from '../stores/chessStore';

interface GameEnginesWindowProps {
  isOpen: boolean;
  onClose: () => void;
  onMouseDown?: () => void;
  windowId?: string;
  zIndex?: number;
}

// Map engine names to their icon paths
const getEngineIcon = (engineName: string): string => {
  switch (engineName) {
    case 'chess-potato-ai-3000':
      return './icons/engine-potato.png';
    case 'alphabet':
      return './icons/engine-alphabet.png';
    case 'stockfish_level_0':
    case 'stockfish_default':
    case 'stockfish_unbeatable':
      return './icons/engine-stockfish.png';
    case OFFLINE_ENGINE:
      return './icons/engine-offline.png';
    default:
      return './icons/engine-generic.png';
  }
};

export const GameEnginesWindow: React.FC<GameEnginesWindowProps> = ({
  isOpen,
  onClose,
  onMouseDown,
  windowId,
  zIndex,
}) => {
  const { t } = useTranslation();
  const { selectedEngine, availableEngines, engineFetchState, setSelectedEngine } = useChessStore();

  const handleEngineChange = (engineName: string) => {
    setSelectedEngine(engineName);
  };

  const getCenterPosition = () => {
    const windowWidth = 360;
    const windowHeight = 500;// Approximate height
    return {
      x: Math.max(0, (window.innerWidth - windowWidth) / 2 - 50),
      y: Math.max(0, (window.innerHeight - windowHeight) / 2),
    };
  };

  return (
    <DraggableWindow
      className="engine-window"
      title={t('engine.title', 'Select Engine')}
      isOpen={isOpen}
      onClose={onClose}
      onMouseDown={onMouseDown}
      defaultPosition={getCenterPosition()}
      windowId={windowId}
      zIndex={zIndex}
    >
      <div className="engine-content">
        {engineFetchState === 'loading' && (
          <div className="engine-loading">
            <p>{t('engine.loading', 'Loading available engines...')}</p>
          </div>
        )}

        {engineFetchState === 'error' && (
          <div className="engine-error">
            <p>{t('engine.error', 'Failed to load engines from server. Using offline mode.')}</p>
          </div>
        )}

        {availableEngines.length > 0 && (
          <fieldset>
            <legend>{t('engine.select', 'Choose your opponent')}</legend>
            <div className="engine-list">
              {availableEngines.map((engine) => (
                <div key={engine.name} className="engine-row">
                  <div className="engine-controls">
                    <input
                      id={`engine-${engine.name}`}
                      type="radio"
                      name="engine-selection"
                      value={engine.name}
                      checked={selectedEngine === engine.name}
                      onChange={() => handleEngineChange(engine.name)}
                    />
                    <label htmlFor={`engine-${engine.name}`}>
                      <img
                        src={getEngineIcon(engine.name)}
                        alt=""
                        className="engine-icon pixelated"
                      />
                    </label>
                  </div>
                  <div className="engine-info">
                    <label htmlFor={`engine-${engine.name}`} className="engine-name">
                      {engine.display_name}
                    </label>
                    <label htmlFor={`engine-${engine.name}`} className="engine-description">
                      {engine.description}
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </fieldset>
        )}

        {availableEngines.length > 0 && (
          <div className="window-actions">
            <button onClick={onClose}>
              {t('engine.ok', 'OK')}
            </button>
          </div>
        )}

        {availableEngines.length === 0 && engineFetchState !== 'loading' && (
          <div className="engine-empty">
            <p>{t('engine.none', 'No engines available.')}</p>
          </div>
        )}
      </div>
    </DraggableWindow>
  );
};

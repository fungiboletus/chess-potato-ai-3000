import React from 'react';
import { useTranslation } from 'react-i18next';
import { DraggableWindow } from './DraggableWindow';
import useChessStore, { selectIsOfflineMode } from '../stores/chessStore';
import { getEngineIcon } from './engineIcons';
import { getEngineDescription, getEngineDisplayName } from '../utils/engineI18n';

interface GameEnginesWindowProps {
  isOpen: boolean;
  onClose: () => void;
  onMouseDown?: () => void;
  windowId?: string;
  zIndex?: number;
}

export const GameEnginesWindow: React.FC<GameEnginesWindowProps> = ({
  isOpen,
  onClose,
  onMouseDown,
  windowId,
  zIndex,
}) => {
  const { t } = useTranslation();
  const { selectedEngine, availableEngines, engineFetchState, engineLocked, setSelectedEngine } = useChessStore();
  const isOfflineMode = useChessStore(selectIsOfflineMode);

  // Determine the lock reason
  const params = new URLSearchParams(window.location.search);
  const isLockedByUrl = params.get('lockEngine') === 'true';
  const isLockedByOffline = engineLocked && !isLockedByUrl && isOfflineMode;

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
        {engineLocked && isLockedByUrl && (
          <div className="engine-locked">
            <p>{t('engine.locked', 'Engine selection is locked by URL parameter.')}</p>
          </div>
        )}
        {isLockedByOffline && (
          <div className="engine-locked">
            <p>{t('engine.lockedOffline', 'Engine locked to offline mode. Start a new game to change engine.')}</p>
          </div>
        )}

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
                      disabled={engineLocked}
                    />
                    <label htmlFor={`engine-${engine.name}`}>
                      <img
                        src={getEngineIcon(engine.name)}
                        alt=""
                        height="32"
                        width="32"
                        className="engine-icon pixelated"
                      />
                    </label>
                  </div>
                  <div className="engine-info">
                    <label htmlFor={`engine-${engine.name}`} className="engine-name">
                      {getEngineDisplayName(engine)}
                    </label>
                    <label htmlFor={`engine-${engine.name}`} className="engine-description">
                      {getEngineDescription(engine)}
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

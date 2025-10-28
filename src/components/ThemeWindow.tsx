import React from 'react';
import { useTranslation } from 'react-i18next';
import { DraggableWindow } from './DraggableWindow';
import useChessStore from '../stores/chessStore';

interface ThemeWindowProps {
  isOpen: boolean;
  onClose: () => void;
  onMouseDown?: () => void;
  windowId?: string;
  zIndex?: number;
}

// Available piece themes (based on /public/pieces folder)
const PIECE_THEMES = [
  'cburnett',
  'alpha', 'anarcandy', 'caliente', 'california', 'cardinal',
  'celtic', 'chess7', 'chessnut', 'companion', 'cooke', 'disguised',
  'dubrovny', 'fantasy', 'firi', 'fresca', 'gioco', 'governor', 'horsey',
  'icpieces', 'kiwen-suwi', 'kosal', 'leipzig', 'letter', 'maestro',
  'merida', 'monarchy', 'mono', 'mpchess', 'pirouetti', 'pixel',
  'reillycraig', 'rhosgfx', 'riohacha', 'shapes', 'spatial', 'staunty',
  'tatiana', 'xkcd'
];

// Available board themes (based on /public/boards folder)
const BOARD_THEMES = [
  { name: 'blue', file: 'blue.png', thumbnail: 'blue.thumbnail.webp' },
  { name: 'blue2', file: 'blue2.jpg', thumbnail: 'blue2.thumbnail.webp' },
  { name: 'blue3', file: 'blue3.jpg', thumbnail: 'blue3.thumbnail.webp' },
  { name: 'blue-marble', file: 'blue-marble.jpg', thumbnail: 'blue-marble.thumbnail.webp' },
  { name: 'brown', file: 'brown.png', thumbnail: 'brown.thumbnail.webp' },
  { name: 'canvas2', file: 'canvas2.jpg', thumbnail: 'canvas2.thumbnail.webp' },
  { name: 'green', file: 'green.png', thumbnail: 'green.thumbnail.webp' },
  { name: 'green-plastic', file: 'green-plastic.png', thumbnail: 'green-plastic.thumbnail.webp' },
  { name: 'grey', file: 'grey.jpg', thumbnail: 'grey.thumbnail.webp' },
  { name: 'horsey', file: 'horsey.jpg', thumbnail: 'horsey.thumbnail.webp' },
  { name: 'ic', file: 'ic.png', thumbnail: 'ic.thumbnail.webp' },
  { name: 'leather', file: 'leather.jpg', thumbnail: 'leather.thumbnail.webp' },
  { name: 'maple', file: 'maple.jpg', thumbnail: 'maple.thumbnail.webp' },
  { name: 'maple2', file: 'maple2.jpg', thumbnail: 'maple2.thumbnail.webp' },
  { name: 'marble', file: 'marble.jpg', thumbnail: 'marble.thumbnail.webp' },
  { name: 'metal', file: 'metal.jpg', thumbnail: 'metal.thumbnail.webp' },
  { name: 'ncf-board', file: 'ncf-board.png', thumbnail: 'ncf-board.thumbnail.webp' },
  { name: 'olive', file: 'olive.jpg', thumbnail: 'olive.thumbnail.webp' },
  { name: 'pink-pyramid', file: 'pink-pyramid.png', thumbnail: 'pink-pyramid.thumbnail.webp' },
  { name: 'purple', file: 'purple.png', thumbnail: 'purple.thumbnail.webp' },
  { name: 'purple-diag', file: 'purple-diag.png', thumbnail: 'purple-diag.thumbnail.webp' },
  { name: 'wood', file: 'wood.jpg', thumbnail: 'wood.thumbnail.webp' },
  { name: 'wood2', file: 'wood2.jpg', thumbnail: 'wood2.thumbnail.webp' },
  { name: 'wood3', file: 'wood3.jpg', thumbnail: 'wood3.thumbnail.webp' },
  { name: 'wood4', file: 'wood4.jpg', thumbnail: 'wood4.thumbnail.webp' },
];

export const ThemeWindow: React.FC<ThemeWindowProps> = ({
  isOpen,
  onClose,
  onMouseDown,
  windowId,
  zIndex,
}) => {
  const { t } = useTranslation();
  const { selectedPieceTheme, selectedBoardTheme, crtEffectEnabled, setSelectedPieceTheme, setSelectedBoardTheme, setCrtEffectEnabled } = useChessStore();

  const handlePieceThemeChange = (theme: string) => {
    setSelectedPieceTheme(theme);
  };

  const handleBoardThemeChange = (theme: string) => {
    setSelectedBoardTheme(theme);
  };

  const getCenterPosition = () => {
    const windowWidth = 600;
    const windowHeight = 600;
    return {
      x: Math.max(0, (window.innerWidth - windowWidth) / 2),
      y: Math.max(0, (window.innerHeight - windowHeight) / 2),
    };
  };

  return (
    <DraggableWindow
      className="theme-window"
      title={t('theme.title', 'Change Theme')}
      isOpen={isOpen}
      onClose={onClose}
      onMouseDown={onMouseDown}
      defaultPosition={getCenterPosition()}
      windowId={windowId}
      zIndex={zIndex}
    >
      <div className="theme-content">
        <fieldset>
          <legend>{t('theme.pieces', 'Pieces')}</legend>
          <div className="theme-grid">
            {PIECE_THEMES.map((theme) => (
              <button
                key={theme}
                className={`theme-button ${selectedPieceTheme === theme ? 'selected' : ''}`}
                onClick={() => handlePieceThemeChange(theme)}
                title={theme}
              >
                <img
                  src={`/pieces/${theme}/bP.svg`}
                  alt={theme}
                  className="piece-preview"
                />
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend>{t('theme.board', 'Board')}</legend>
          <div className="theme-grid">
            {BOARD_THEMES.map((board) => (
              <button
                key={board.name}
                className={`theme-button ${selectedBoardTheme === board.name ? 'selected' : ''}`}
                onClick={() => handleBoardThemeChange(board.name)}
                title={board.name}
              >
                <img
                  src={`/boards/${board.thumbnail}`}
                  alt={board.name}
                  className="board-preview"
                />
              </button>
            ))}
          </div>
        </fieldset>

        <div className="field-row" style={{ marginTop: '16px' }}>
          <input
            id="theme-crt-effect"
            type="checkbox"
            checked={crtEffectEnabled}
            onChange={event => setCrtEffectEnabled(event.target.checked)}
          />
          <label htmlFor="theme-crt-effect">
            {t('theme.crt_effect', 'CRT scanlines effect')}
          </label>
        </div>

        <div className="window-actions">
          <button onClick={onClose}>
            {t('theme.ok', 'OK')}
          </button>
        </div>
      </div>
    </DraggableWindow>
  );
};

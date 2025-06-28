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
  const getResultConfig = () => {
    switch (result) {
      case 'win':
        return {
          title: '🎉 Victory! 🎉',
          gifPlaceholder: '🏆 WINNER! 🏆',
          sound: '🔊 *victory fanfare*',
        };
      case 'lose':
        return {
          title: '💀 Defeat 💀',
          gifPlaceholder: '😵 GAME OVER 😵',
          sound: '🔊 *sad trombone*',
        };
      case 'draw':
        return {
          title: '🤝 Draw 🤝',
          gifPlaceholder: '🤷 IT\'S A TIE 🤷',
          sound: '🔊 *neutral beep*',
        };
    }
  };

  const config = getResultConfig();

  return (
    <DraggableWindow
      title={config.title}
      isOpen={isOpen}
      onClose={onClose}
      windowId={`game-result-${result}`}
      responsivePosition="center"
      positionOffset={{ x: 0, y: -50 }}
      width={350}
      height={280}
      minWidth={300}
      minHeight={200}
      className="game-result-window"
    >
      <div className={`game-result-content ${result}`}>
        {/* Placeholder for GIF */}
        <div className="game-result-gif-placeholder">
          {config.gifPlaceholder}
          <small>
            (GIF placeholder)
          </small>
        </div>

        <div className="game-result-message">
          {message}
        </div>

        <div className="game-result-sound">
          {config.sound}
        </div>

        <button
          onClick={onClose}
          className="game-result-button"
        >
          Close
        </button>
      </div>
    </DraggableWindow>
  );
};

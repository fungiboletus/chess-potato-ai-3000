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
          title: 'Victory!',
          gifPlaceholder: '🏆 WINNER! 🏆',
        };
      case 'lose':
        return {
          title: 'Defeat',
          gifPlaceholder: '😵 GAME OVER 😵',
        };
      case 'draw':
        return {
          title: 'Draw',
          gifPlaceholder: '🤷 IT\'S A TIE 🤷',
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
            (GIF placeholder)
          </small>
        </div>

        <div className="game-result-message">
          {message}
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

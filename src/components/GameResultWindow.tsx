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
          bgColor: '#90EE90',
          borderColor: '#32CD32',
          sound: '🔊 *victory fanfare*',
        };
      case 'lose':
        return {
          title: '💀 Defeat 💀',
          gifPlaceholder: '😵 GAME OVER 😵',
          bgColor: '#FFB6C1',
          borderColor: '#DC143C',
          sound: '🔊 *sad trombone*',
        };
      case 'draw':
        return {
          title: '🤝 Draw 🤝',
          gifPlaceholder: '🤷 IT\'S A TIE 🤷',
          bgColor: '#FFE4B5',
          borderColor: '#DEB887',
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
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        padding: '16px',
        textAlign: 'center',
        background: config.bgColor,
        border: `2px solid ${config.borderColor}`,
        boxSizing: 'border-box',
      }}>
        {/* Placeholder for GIF */}
        <div style={{
          width: '120px',
          height: '120px',
          background: '#f0f0f0',
          border: '2px inset #c0c0c0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '14px',
          fontWeight: 'bold',
          marginBottom: '16px',
          borderRadius: '4px',
        }}>
          {config.gifPlaceholder}
          <br />
          <small style={{ fontSize: '10px', marginTop: '4px' }}>
            (GIF placeholder)
          </small>
        </div>

        <div style={{
          fontSize: '16px',
          fontWeight: 'bold',
          marginBottom: '12px',
          fontFamily: 'MS Sans Serif, sans-serif',
        }}>
          {message}
        </div>

        <div style={{
          fontSize: '12px',
          fontStyle: 'italic',
          marginBottom: '16px',
          color: '#666',
        }}>
          {config.sound}
        </div>

        <button
          onClick={onClose}
          style={{
            padding: '6px 16px',
            fontSize: '12px',
            marginTop: '8px',
          }}
        >
          Close
        </button>
      </div>
    </DraggableWindow>
  );
};

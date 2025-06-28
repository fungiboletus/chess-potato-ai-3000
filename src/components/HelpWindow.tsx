import { DraggableWindow } from './DraggableWindow';

interface HelpWindowProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpWindow: React.FC<HelpWindowProps> = ({
  isOpen,
  onClose,
}) => {
  return (
    <DraggableWindow
      title="Chess Potato AI 3000 - Help"
      isOpen={isOpen}
      onClose={onClose}
      windowId="help"
      responsivePosition="left-center"
      positionOffset={{ x: 50, y: -50 }}
      width={320}
      height={400}
      minWidth={280}
      minHeight={350}
    >
      <div style={{
        padding: '12px',
        fontFamily: 'MS Sans Serif, sans-serif',
        fontSize: '11px',
        lineHeight: '1.6',
      }}>
        <h3 style={{
          margin: '0 0 12px 0',
          fontSize: '12px',
          color: '#000080',
        }}>
          🎮 How to Play
        </h3>

        <div style={{ marginBottom: '16px' }}>
          <strong>🎯 Goal:</strong> Checkmate the AI opponent!<br />
          <strong>🤖 AI:</strong> Random but challenging moves<br />
          <strong>🎲 Color:</strong> Randomly assigned each game
        </div>

        <h3 style={{
          margin: '0 0 8px 0',
          fontSize: '12px',
          color: '#000080',
        }}>
          ⌨️ Keyboard Shortcuts
        </h3>

        <div style={{
          background: '#f0f0f0',
          border: '1px inset #c0c0c0',
          padding: '8px',
          marginBottom: '12px',
          fontFamily: 'Consolas, monospace',
        }}>
          <strong>H</strong> - Toggle Move History<br />
          <strong>N</strong> - Start New Game<br />
          <strong>?</strong> - Show this Help
        </div>

        <h3 style={{
          margin: '0 0 8px 0',
          fontSize: '12px',
          color: '#000080',
        }}>
          🪟 Windows
        </h3>

        <div style={{ marginBottom: '12px' }}>
          • <strong>Move History:</strong> Shows all game moves<br />
          • <strong>Result Window:</strong> Celebrates wins/draws/losses<br />
          • <strong>Draggable:</strong> Move windows around!<br />
          • <strong>Persistent:</strong> Window positions are saved
        </div>

        <div style={{
          textAlign: 'center',
          fontSize: '10px',
          color: '#666',
          fontStyle: 'italic',
        }}>
          Made with ❤️ and Windows 98 nostalgia
        </div>
      </div>
    </DraggableWindow>
  );
};

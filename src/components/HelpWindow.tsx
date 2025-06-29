import { DraggableWindow } from './DraggableWindow';

interface HelpWindowProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpWindow: React.FC<HelpWindowProps> = ({
  isOpen,
  onClose,
}) => {
  // Position window on the left side of the screen
  const getLeftSidePosition = () => {
    return {
      x: 50,
      y: Math.max(50, (window.innerHeight - 450) / 2)
    };
  };

  return (
    <DraggableWindow
      title="Chess Potato AI 3000 - Help"
      isOpen={isOpen}
      onClose={onClose}
      defaultPosition={getLeftSidePosition()}
    >
      <div className="help-content">
        <h3 className="help-heading">
          🎮 How to Play
        </h3>

        <div className="help-section">
          <strong>🎯 Goal:</strong> Checkmate the AI opponent!<br />
          <strong>🤖 AI:</strong> Random but challenging moves<br />
          <strong>🎲 Color:</strong> Randomly assigned each game
        </div>

        <h3 className="help-heading">
          ⌨️ Keyboard Shortcuts
        </h3>

        <div className="help-shortcuts">
          <strong>H</strong> - Toggle Move History<br />
          <strong>N</strong> - Start New Game<br />
          <strong>?</strong> - Show this Help
        </div>

        <h3 className="help-heading">
          🪟 Windows
        </h3>

        <div className="help-section">
          • <strong>Move History:</strong> Shows all game moves<br />
          • <strong>Result Window:</strong> Celebrates wins/draws/losses<br />
          • <strong>Draggable:</strong> Move windows around!<br />
          • <strong>Persistent:</strong> Window positions are saved
        </div>

        <div className="help-footer">
          Made with ❤️ and Windows 98 nostalgia
        </div>
      </div>
    </DraggableWindow>
  );
};

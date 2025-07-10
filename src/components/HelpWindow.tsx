import { DraggableWindow } from './DraggableWindow';

interface HelpWindowProps {
  isOpen: boolean;
  onClose: () => void;
  onMouseDown?: () => void;
}

export const HelpWindow: React.FC<HelpWindowProps> = ({
  isOpen,
  onClose,
  onMouseDown,
}) => {
  const WINDOW_WIDTH = 350;
  // Position window on the left side of the screen
  const getLeftSidePosition = () => {

    // 50px from the right edge
    const innerWidth = window.innerWidth;
    const innerHeight = window.innerHeight;
    const leftEdge = Math.max(0, innerWidth - WINDOW_WIDTH - 100);
    const topEdge = Math.max(0, (innerHeight - 500) / 2);

    return {
      x: leftEdge,
      y: topEdge,
    };
  };

  return (
    <DraggableWindow
      className="help-window"
      title="Chess Potato AI 3000 - Help"
      isOpen={isOpen}
      onClose={onClose}
      onMouseDown={onMouseDown}
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

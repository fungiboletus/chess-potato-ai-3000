import { DraggableWindow } from './DraggableWindow';

interface MoveHistoryWindowProps {
  isOpen: boolean;
  onClose: () => void;
  moveHistory: string[];
}

export const MoveHistoryWindow: React.FC<MoveHistoryWindowProps> = ({
  isOpen,
  onClose,
  moveHistory,
}) => {
  const formatMoveHistory = () => {
    if (moveHistory.length === 0) return 'No moves yet...';

    let formatted = '';
    for (let i = 0; i < moveHistory.length; i += 2) {
      //const moveNumber = Math.floor(i / 2) + 1;
      const whiteMove = moveHistory[i] || '';
      const blackMove = moveHistory[i + 1] || '';
      //formatted += `${moveNumber}. ${whiteMove}`;
      formatted += whiteMove;
      if (blackMove) {
        formatted += ` ${blackMove}`;
      }
      formatted += '\n';
    }
    return formatted.trim();
  };

  // Position window on the right side of the screen
  const getRightSidePosition = () => {
    const windowWidth = 250; // estimated window width
    return {
      x: Math.max(0, window.innerWidth - windowWidth - 20),
      y: 100
    };
  };

  return (
    <DraggableWindow
      title="Move History"
      isOpen={isOpen}
      onClose={onClose}
      defaultPosition={getRightSidePosition()}
    >
      <div className="move-history-content">
        {formatMoveHistory()}
      </div>
    </DraggableWindow>
  );
};

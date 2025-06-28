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

  return (
    <DraggableWindow
      title="Move History"
      isOpen={isOpen}
      onClose={onClose}
      windowId="move-history"
      responsivePosition="right-center"
      positionOffset={{ x: -300, y: 0 }}
      width={100}
      height={320}
      minWidth={100}
      minHeight={200}
    /*className="move-history-window"*/
    >
      <div className="move-history-content">
        {formatMoveHistory()}
      </div>
    </DraggableWindow>
  );
};

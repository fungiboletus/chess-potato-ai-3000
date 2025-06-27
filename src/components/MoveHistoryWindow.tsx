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
      const moveNumber = Math.floor(i / 2) + 1;
      const whiteMove = moveHistory[i] || '';
      const blackMove = moveHistory[i + 1] || '';
      formatted += `${moveNumber}. ${whiteMove}`;
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
      defaultPosition={{ x: 650, y: 100 }}
      width={280}
      height={320}
      minWidth={200}
      minHeight={200}
      className="move-history-window"
    >
      <div style={{
        background: 'white',
        border: '1px inset #c0c0c0',
        padding: '8px',
        height: 'calc(100% - 16px)',
        overflow: 'auto',
        fontFamily: 'Consolas, "Courier New", monospace',
        fontSize: '12px',
        whiteSpace: 'pre-wrap',
        lineHeight: '1.4',
      }}>
        {formatMoveHistory()}
      </div>
    </DraggableWindow>
  );
};

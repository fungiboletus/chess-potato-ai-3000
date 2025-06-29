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
  const generateMoveRows = () => {
    if (moveHistory.length === 0) {
      return (
        <tr>
          <td colSpan={2}>No moves yet...</td>
        </tr>
      );
    }

    const rows = [];
    for (let i = 0; i < moveHistory.length; i += 2) {
      const whiteMove = moveHistory[i] || '';
      const blackMove = moveHistory[i + 1] || '';

      rows.push(
        <tr key={i}>
          <td>{whiteMove}</td>
          <td>{blackMove}</td>
        </tr>
      );
    }
    return rows;
  };

  const WINDOW_WIDTH = 200;

  // Position window on the right side of the screen
  const getRightSidePosition = () => {

    const innerWidth = window.innerWidth;
    const innerHeight = window.innerHeight;
    const leftEdge = Math.max(0, innerWidth - WINDOW_WIDTH - 100);
    const topEdge = Math.max(0, (innerHeight - 300) / 2);

    return {
      x: leftEdge,
      y: topEdge,
    };

  };

  return (
    <DraggableWindow
      className="move-history-window"
      title="Move History"
      isOpen={isOpen}
      onClose={onClose}
      defaultPosition={getRightSidePosition()}
    >
      <div className="move-history-content sunken-panel">
        <table className="interactive" style={{ tableLayout: 'fixed', width: '100%' }}>
          <thead>
            <tr>
              <th style={{ width: '90px' }}>White</th>
              <th style={{ width: '90px' }}>Black</th>
            </tr>
          </thead>
          <tbody>
            {generateMoveRows()}
          </tbody>
        </table>
      </div>
    </DraggableWindow>
  );
};

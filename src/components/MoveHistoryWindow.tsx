import useChessStore from '../stores/chessStore';
import { DraggableWindow } from './DraggableWindow';

interface MoveHistoryWindowProps {
  isOpen: boolean;
  onClose: () => void;
  onMouseDown?: () => void;
  moveHistory: string[];
}

export const MoveHistoryWindow: React.FC<MoveHistoryWindowProps> = ({
  isOpen,
  onClose,
  moveHistory,
  onMouseDown,
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

  // computed property for current FEN
  const currentFen = useChessStore(state => state.chessgroundApi?.getFen() || 'N/A');

  return (
    <DraggableWindow
      className="move-history-window"
      title="Move History"
      isOpen={isOpen}
      onClose={onClose}
      onMouseDown={onMouseDown}
      defaultPosition={getRightSidePosition()}
    >
      <div className="move-history-content">
        <div className="sunken-panel move-history-scrollable">
          <table className="interactive">
            <thead>
              <tr>
                <th>White</th>
                <th>Black</th>
              </tr>
            </thead>
            <tbody>
              {generateMoveRows()}
            </tbody>
          </table>
        </div>

        <dl className="fen-section">
          <dt>Current FEN:</dt>
          <dd>{currentFen}</dd>
        </dl>
      </div>
    </DraggableWindow>
  );
};

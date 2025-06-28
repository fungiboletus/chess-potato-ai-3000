import useChessStore from '../stores/chessStore';
import { resetAllWindowPositions, getViewportDimensions } from '../utils/windowPositioning';

export const DebugPanel: React.FC = () => {
  const { gameState, playerColor, isPlayerTurn, moveHistory, chess } = useChessStore();
  const viewport = getViewportDimensions();

  // Only show in development (simple check for localhost)
  if (!window.location.hostname.includes('localhost')) {
    return null;
  }

  const handleResetPositions = () => {
    resetAllWindowPositions();
    window.location.reload(); // Simple way to reset positions
  };

  return (
    <div className="debug-panel">
      <div className="debug-panel-title">Debug Info</div>
      <div>State: {gameState}</div>
      <div>Player: {playerColor}</div>
      <div>Player Turn: {isPlayerTurn ? 'Yes' : 'No'}</div>
      <div>Chess Turn: {chess.turn() === 'w' ? 'White' : 'Black'}</div>
      <div>Moves: {moveHistory.length}</div>
      <div>Last Move: {moveHistory[moveHistory.length - 1] || 'None'}</div>
      <div className="debug-panel-viewport">
        Viewport: {viewport.width}x{viewport.height}
      </div>
      <button
        onClick={handleResetPositions}
        className="debug-panel-button"
      >
        Reset Window Positions
      </button>
    </div>
  );
};

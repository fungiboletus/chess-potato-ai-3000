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
    <div style={{
      position: 'fixed',
      top: 10,
      right: 10,
      background: '#f0f0f0',
      border: '2px inset #c0c0c0',
      padding: '8px',
      fontSize: '11px',
      fontFamily: 'MS Sans Serif, sans-serif',
      maxWidth: '200px',
      zIndex: 9999
    }}>
      <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Debug Info</div>
      <div>State: {gameState}</div>
      <div>Player: {playerColor}</div>
      <div>Player Turn: {isPlayerTurn ? 'Yes' : 'No'}</div>
      <div>Chess Turn: {chess.turn() === 'w' ? 'White' : 'Black'}</div>
      <div>Moves: {moveHistory.length}</div>
      <div>Last Move: {moveHistory[moveHistory.length - 1] || 'None'}</div>
      <div style={{ marginTop: '8px', fontSize: '10px' }}>
        Viewport: {viewport.width}x{viewport.height}
      </div>
      <button
        onClick={handleResetPositions}
        style={{
          marginTop: '4px',
          fontSize: '10px',
          padding: '2px 4px',
          width: '100%'
        }}
      >
        Reset Window Positions
      </button>
    </div>
  );
};

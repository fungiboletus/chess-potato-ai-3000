import useChessStore from '../stores/chessStore';

export const DebugPanel: React.FC = () => {
  const { gameState, playerColor, isPlayerTurn, moveHistory, chess } = useChessStore();

  // Only show in development (simple check for localhost)
  if (!window.location.hostname.includes('localhost')) {
    return null;
  }

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
    </div>
  );
};

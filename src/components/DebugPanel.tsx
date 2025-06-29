import useChessStore from '../stores/chessStore';

export const DebugPanel: React.FC = () => {
  const { gameState, playerColor, isPlayerTurn, moveHistory, chess } = useChessStore();

  // Only show in development (simple check for localhost)
  if (!window.location.hostname.includes('localhost')) {
    return null;
  }

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
        Viewport: {window.innerWidth}x{window.innerHeight}
      </div>
    </div>
  );
};

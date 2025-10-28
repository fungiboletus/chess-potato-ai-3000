import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import useChessStore from '../stores/chessStore';

export const MoveHistoryActions: React.FC = () => {
  const { t } = useTranslation();

  const gameState = useChessStore(state => state.gameState);
  const isPlayerTurn = useChessStore(state => state.isPlayerTurn);
  const gameStarted = useChessStore(state => state.gameStarted);
  const moveHistory = useChessStore(state => state.moveHistory);
  const undoLastPlayerMove = useChessStore(state => state.undoLastPlayerMove);
  const rewindMode = useChessStore(state => state.rewindMode);
  const exitRewindMode = useChessStore(state => state.exitRewindMode);

  // Track current time for timestamp comparison (updates every 30 seconds)
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 30_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  // Find the last move made by the human player
  const lastPlayerMove = useMemo(() => {
    for (let i = moveHistory.length - 1; i >= 0; i--) {
      if (moveHistory[i].playerKey === 'human') {
        return moveHistory[i];
      }
    }
    return null;
  }, [moveHistory]);

  const THIRTY_MINUTES_MS = 30 * 60 * 1000;
  const hasRecentPlayerMove = Boolean(
    lastPlayerMove && now - lastPlayerMove.timestamp <= THIRTY_MINUTES_MS
  );

  const canUndo = isPlayerTurn &&
    gameState === 'player_turn' &&
    gameStarted &&
    hasRecentPlayerMove &&
    !rewindMode?.active;

  const undoDisabled = !canUndo;

  const handleUndoLastMove = () => {
    undoLastPlayerMove();
  };

  return (
    <div className="move-history-actions">
      <button
        className="move-history-action-button undo-move-button"
        onClick={handleUndoLastMove}
        disabled={undoDisabled}
      >
        {t('move_history.undo', { defaultValue: 'Takeback' })}
      </button>
      <button
        className="move-history-action-button back-to-game-button"
        disabled={!rewindMode?.active}
        onClick={exitRewindMode}
      >
        {t('move_history.backToGame')}
      </button>
    </div>
  );
};

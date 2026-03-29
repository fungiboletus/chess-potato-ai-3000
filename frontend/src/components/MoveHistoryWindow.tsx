import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import useChessStore, { selectIsOfflineMode } from '../stores/chessStore';
import { DraggableWindow } from './DraggableWindow';
import { MoveHistoryActions } from './MoveHistoryActions';
import { getEvaluationAttributes } from '../utils/evaluationFormatter';
import type { MoveRecord } from '../stores/chessStore';

const MOVE_HISTORY_STORAGE_KEY = 'moveHistory.showEvaluations';

interface MoveHistoryWindowProps {
  isOpen: boolean;
  onClose: () => void;
  onMouseDown?: () => void;
  moveHistory: MoveRecord[];
  windowId?: string;
  zIndex?: number;
}

export const MoveHistoryWindow: React.FC<MoveHistoryWindowProps> = ({
  isOpen,
  onClose,
  moveHistory,
  onMouseDown,
  windowId,
  zIndex,
}) => {
  const { t } = useTranslation();
  const availableEngines = useChessStore(state => state.availableEngines);
  const isOfflineMode = useChessStore(selectIsOfflineMode);
  const gameState = useChessStore(state => state.gameState);
  const rewindMode = useChessStore(state => state.rewindMode);
  const enterRewindMode = useChessStore(state => state.enterRewindMode);
  const exitRewindMode = useChessStore(state => state.exitRewindMode);
  const moveHistoryFocusRequestId = useChessStore(state => state.moveHistoryFocusRequestId);
  const positionEvaluations = useChessStore(state => state.positionEvaluations);
  const loadPositionEvaluations = useChessStore(state => state.loadPositionEvaluations);
  const scrollableRef = useRef<HTMLDivElement>(null);
  const moveRowRefs = useRef<(HTMLTableRowElement | null)[]>([]);
  const [showEvaluations, setShowEvaluations] = useState<boolean>(() => {
    if (typeof window === 'undefined') {
      return true;
    }

    const storedValue = window.localStorage.getItem(MOVE_HISTORY_STORAGE_KEY);
    return storedValue === null ? true : storedValue === 'true';
  });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(MOVE_HISTORY_STORAGE_KEY, showEvaluations ? 'true' : 'false');
  }, [showEvaluations]);

  const handleClose = () => {
    // Exit rewind mode when closing the window
    if (rewindMode?.active) {
      exitRewindMode();
    }
    onClose();
  };

  // Autoscroll to bottom when move history changes
  useEffect(() => {
    if (scrollableRef.current) {
      scrollableRef.current.scrollTop = scrollableRef.current.scrollHeight;
    }
  }, [moveHistory]);

  const getPlayerDisplayName = (moveRecord: MoveRecord): string => {
    if (moveRecord.playerKey === 'human') {
      return t('player.human');
    }
    if (moveRecord.engineDisplayName) {
      return moveRecord.engineDisplayName;
    }
    const engine = availableEngines.find(e => e.name === moveRecord.engineName || e.name === moveRecord.playerKey);
    return engine?.display_name || moveRecord.engineName || moveRecord.playerKey;
  };


  const isEmpty = moveHistory.length === 0;
  const highlightedIndex = rewindMode?.active ? rewindMode.moveIndex : moveHistory.length - 1;

  const handleRowClick = (index: number) => {
    // Disable clicks when AI is thinking
    if (gameState === 'ai_thinking') {
      return;
    }

    const latestMoveIndex = moveHistory.length - 1;

    // If clicking on the latest move, exit rewind mode
    if (index === latestMoveIndex) {
      exitRewindMode();
    } else {
      // Otherwise, enter rewind mode for this move
      enterRewindMode(index);
    }
  };

  // Handle keyboard navigation for move history
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (moveHistory.length === 0 || gameState === 'ai_thinking') {
      return;
    }

    const currentIndex = rewindMode?.active ? rewindMode.moveIndex : moveHistory.length - 1;
    const maxIndex = moveHistory.length - 1;

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const newIndex = Math.max(0, currentIndex - 1);
      if (newIndex !== currentIndex) {
        enterRewindMode(newIndex);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const newIndex = Math.min(maxIndex, currentIndex + 1);

      // If we're at the latest move, exit rewind mode
      if (newIndex === maxIndex && rewindMode?.active) {
        exitRewindMode();
      } else if (newIndex !== currentIndex) {
        enterRewindMode(newIndex);
      }
    }
  };

  // Auto-focus the scrollable div when the window is opened or refocus is requested
  useEffect(() => {
    if (!isOpen || !scrollableRef.current) {
      return;
    }
    scrollableRef.current.focus({ preventScroll: true });
  }, [isOpen, moveHistoryFocusRequestId]);

  useEffect(() => {
    moveRowRefs.current.length = moveHistory.length;
  }, [moveHistory.length]);



  useEffect(() => {
    const shouldLoadEvaluations = isOpen && showEvaluations && moveHistory.length > 0 && !isOfflineMode;
    if (!shouldLoadEvaluations) {
      return;
    }

    void loadPositionEvaluations();
  }, [loadPositionEvaluations, isOpen, showEvaluations, moveHistory.length, isOfflineMode]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleOnline = () => {
      const shouldLoadEvaluations = isOpen && showEvaluations && moveHistory.length > 0 && !isOfflineMode;
      if (!shouldLoadEvaluations) {
        return;
      }

      void loadPositionEvaluations();
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [loadPositionEvaluations, isOpen, showEvaluations, moveHistory.length, isOfflineMode]);

  // Keep the highlighted row within the visible scroll region without forcing unwanted jumps
  useEffect(() => {
    if (!scrollableRef.current || highlightedIndex < 0) {
      return;
    }

    const container = scrollableRef.current;
    const highlightedRow = moveRowRefs.current[highlightedIndex];

    if (!highlightedRow) {
      return;
    }

    const rowTop = highlightedRow.offsetTop;
    const rowBottom = rowTop + highlightedRow.offsetHeight;
    const headerOffset = moveRowRefs.current[0]?.offsetTop ?? 0;
    const viewportTop = container.scrollTop + headerOffset;
    const viewportBottom = container.scrollTop + container.clientHeight;

    if (rowTop < viewportTop) {
      container.scrollTop = Math.max(rowTop - headerOffset, 0);
    } else if (rowBottom > viewportBottom) {
      container.scrollTop = rowBottom - container.clientHeight;
    }
  }, [highlightedIndex]);

  const reallyShowEvaluations = showEvaluations && !isOfflineMode;
  const columnCount = reallyShowEvaluations ? 3 : 2;

  const generateMoveRows = () => {
    if (isEmpty) {
      return (
        <tr>
          <td colSpan={columnCount}>{t('move_history.no_moves')}</td>
        </tr>
      );
    }

    const isInteractive = gameState !== 'ai_thinking';
    return moveHistory.map((moveRecord, index) => {
      const isHighlighted = index === highlightedIndex;
      const className = isHighlighted ? 'highlighted' : '';
      const evaluation = reallyShowEvaluations ? getEvaluationAttributes(moveRecord.fen, positionEvaluations, t) : null;
      const playerName = getPlayerDisplayName(moveRecord);

      return (
        <tr
          key={index}
          ref={el => {
            moveRowRefs.current[index] = el;
          }}
          className={className}
          onClick={isInteractive ? () => handleRowClick(index) : undefined}
          style={isInteractive ? { cursor: 'pointer' } : undefined}
        >
          <td>{moveRecord.san}</td>
          <td title={playerName}>{playerName}</td>
          {reallyShowEvaluations ? (
            <td title={evaluation?.title}>{evaluation?.display ?? '-'}</td>
          ) : null}
        </tr>
      );
    });
  };

  const WINDOW_WIDTH = 260;

  // Position window on the right side of the screen
  const getRightSidePosition = () => {

    const innerWidth = window.innerWidth;
    const innerHeight = window.innerHeight;
    const leftEdge = Math.max(0, innerWidth - WINDOW_WIDTH + 20);
    const topEdge = Math.max(0, (innerHeight - 300) / 2);

    return {
      x: leftEdge,
      y: topEdge,
    };

  };

  // Display FEN: show rewind FEN if active, otherwise the latest move's FEN
  const displayFen = rewindMode?.active
    ? rewindMode.fen
    : (moveHistory.length > 0 ? moveHistory[moveHistory.length - 1].fen : useChessStore.getState().chess.fen());


  return (
    <DraggableWindow
      className="move-history-window"
      title={t('move_history.title')}
      isOpen={isOpen}
      onClose={handleClose}
      onMouseDown={onMouseDown}
      defaultPosition={getRightSidePosition()}
      windowId={windowId}
      zIndex={zIndex}
    >
      <div className="move-history-content">
        <div className="field-row">
          <input
            id="move-history-show-evaluations"
            type="checkbox"
            checked={reallyShowEvaluations}
            disabled={isOfflineMode}
            onChange={event => { if (!isOfflineMode) setShowEvaluations(event.target.checked); }}
          />
          <label htmlFor="move-history-show-evaluations">
            {t('move_history.show_eval_checkbox', { defaultValue: 'Show evaluation' })}
          </label>
        </div>
        <div
          className="sunken-panel move-history-scrollable"
          ref={scrollableRef}
          tabIndex={0}
          onKeyDown={handleKeyDown}
        >
          <table className={`${isEmpty ? '' : 'interactive'} ${gameState === 'ai_thinking' ? 'disabled' : ''}`}>
            <thead>
              <tr>
                <th>{t('move_history.move_column')}</th>
                <th>{t('move_history.player_column')}</th>
                {reallyShowEvaluations ? <th>{t('move_history.eval_column')}</th> : null}
              </tr>
            </thead>
            <tbody>
              {generateMoveRows()}
            </tbody>
          </table>
        </div>

        <dl className="fen-section">
          <dt>{t('move_history.current_fen')}</dt>
          <dd className="text-selectable">{displayFen}</dd>
        </dl>

        <MoveHistoryActions />
      </div>
    </DraggableWindow>
  );
};

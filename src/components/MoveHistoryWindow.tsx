import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import useChessStore from '../stores/chessStore';
import { DraggableWindow } from './DraggableWindow';
import type { MoveRecord } from '../stores/chessStore';

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
  const gameState = useChessStore(state => state.gameState);
  const rewindMode = useChessStore(state => state.rewindMode);
  const enterRewindMode = useChessStore(state => state.enterRewindMode);
  const exitRewindMode = useChessStore(state => state.exitRewindMode);
  const scrollableRef = useRef<HTMLDivElement>(null);
  const moveRowRefs = useRef<(HTMLTableRowElement | null)[]>([]);

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

  const getPlayerDisplayName = (playerKey: string): string => {
    if (playerKey === 'human') {
      return t('player.human');
    }
    // Look up engine display name
    const engine = availableEngines.find(e => e.name === playerKey);
    return engine?.display_name || playerKey;
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

  // Auto-focus the scrollable div when window opens
  useEffect(() => {
    if (isOpen && scrollableRef.current) {
      scrollableRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    moveRowRefs.current.length = moveHistory.length;
  }, [moveHistory.length]);

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

  const generateMoveRows = () => {
    if (isEmpty) {
      return (
        <tr>
          <td colSpan={3}>{t('move_history.no_moves')}</td>
        </tr>
      );
    }

    const isInteractive = gameState !== 'ai_thinking';
    return moveHistory.map((moveRecord, index) => {
      const isHighlighted = index === highlightedIndex;
      const className = isHighlighted ? 'highlighted' : '';

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
          <td>{getPlayerDisplayName(moveRecord.playerKey)}</td>
          <td>{moveRecord.eval}</td>
        </tr>
      );
    });
  };

  const WINDOW_WIDTH = 260;

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
                <th>{t('move_history.eval_column')}</th>
              </tr>
            </thead>
            <tbody>
              {generateMoveRows()}
            </tbody>
          </table>
        </div>

        <dl className="fen-section">
          <dt>{t('move_history.current_fen')}</dt>
          <dd>{displayFen}</dd>
        </dl>

        <button
          className="back-to-game-button"
          disabled={!rewindMode?.active}
          onClick={exitRewindMode}
        >
          {t('move_history.backToGame')}
        </button>
      </div>
    </DraggableWindow>
  );
};

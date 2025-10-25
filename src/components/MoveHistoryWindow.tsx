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
}

export const MoveHistoryWindow: React.FC<MoveHistoryWindowProps> = ({
  isOpen,
  onClose,
  moveHistory,
  onMouseDown,
}) => {
  const { t } = useTranslation();
  const availableEngines = useChessStore(state => state.availableEngines);
  const scrollableRef = useRef<HTMLDivElement>(null);

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

  const generateMoveRows = () => {
    if (moveHistory.length === 0) {
      return (
        <tr>
          <td colSpan={3}>{t('move_history.no_moves')}</td>
        </tr>
      );
    }

    return moveHistory.map((moveRecord, index) => (
      <tr key={index}>
        <td>{moveRecord.san}</td>
        <td>{getPlayerDisplayName(moveRecord.playerKey)}</td>
        <td>{moveRecord.eval}</td>
      </tr>
    ));
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

  // computed property for current FEN
  const currentFen = useChessStore(state => state.chessgroundApi?.getFen() || 'N/A');

  return (
    <DraggableWindow
      className="move-history-window"
      title={t('move_history.title')}
      isOpen={isOpen}
      onClose={onClose}
      onMouseDown={onMouseDown}
      defaultPosition={getRightSidePosition()}
    >
      <div className="move-history-content">
        <div className="sunken-panel move-history-scrollable" ref={scrollableRef}>
          <table className="interactive">
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
          <dd>{currentFen}</dd>
        </dl>
      </div>
    </DraggableWindow>
  );
};

import { useEffect, useRef, useState } from 'react';
import { Chessground } from 'chessground';
import type { Api } from 'chessground/api';
import useChessStore from './stores/chessStore';
import { useChessgroundConfig } from './hooks/useChessgroundConfig';

export const ChessBoard: React.FC = () => {
  const boardRef = useRef<HTMLDivElement>(null);
  const [api, setApi] = useState<Api | null>(null);

  const config = useChessgroundConfig();
  const makePlayerMove = useChessStore(state => state.makePlayerMove);
  const setChessgroundApi = useChessStore(state => state.setChessgroundApi);
  const rewindMode = useChessStore(state => state.rewindMode);
  const gameState = useChessStore(state => state.gameState);
  const isPlayerTurn = useChessStore(state => state.isPlayerTurn);

  // Different cursor states
  const isAIThinking = gameState === 'ai_thinking';
  const isReadOnly = !isPlayerTurn || rewindMode?.active;

  // Initialize chessground once on mount
  useEffect(() => {
    if (boardRef.current && !api) {
      const chessgroundApi = Chessground(boardRef.current, {
        animation: { enabled: true, duration: 200 },

        ...config,
        movable: {
          ...config.movable,
          events: {
            after: (orig: string, dest: string) => {
              makePlayerMove(orig, dest);
            },
          },
        },
      });
      setApi(chessgroundApi);
      setChessgroundApi(chessgroundApi);
    }
    // Only run once on mount - config updates are handled by separate useEffect below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update API reference in store
  useEffect(() => {
    setChessgroundApi(api);
    return () => setChessgroundApi(null);
  }, [api, setChessgroundApi]);

  // Update configuration when it changes
  useEffect(() => {
    if (api) {
      api.set({
        ...config,
        movable: {
          ...config.movable,
          events: {
            after: (orig: string, dest: string) => {
              makePlayerMove(orig, dest);
            },
          },
        },
      });
    }
  }, [api, config, makePlayerMove]);

  return (
    <div className={`chess-board-container ${rewindMode?.active ? 'rewind-mode' : ''} ${isReadOnly ? 'read-only' : ''} ${isAIThinking ? 'ai-thinking' : ''}`}>
      <div ref={boardRef} className="chess-board pixel-theme" />
    </div>
  );
};

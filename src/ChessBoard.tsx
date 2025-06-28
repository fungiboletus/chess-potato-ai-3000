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

  // Initialize chessground
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
    } else if (boardRef.current && api) {
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
  }, [boardRef]);

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
    <div style={{ height: '100%', width: '100%' }}>
      <div ref={boardRef} style={{ height: '100%', width: '100%', display: 'table' }} />
    </div>
  );
};

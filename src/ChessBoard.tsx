import { useEffect, useRef } from 'react';
import { Chessground } from 'chessground';
import type { Api } from 'chessground/api';
import type { Config } from 'chessground/config';

interface ChessBoardProps {
  config: Config;
  onMove?: (orig: string, dest: string) => void;
}

export const ChessBoard: React.FC<ChessBoardProps> = ({ config, onMove }) => {
  const boardRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<Api | null>(null);

  useEffect(() => {
    if (boardRef.current) {
      const finalConfig: Config = {
        ...config,
        movable: {
          ...config.movable,
          events: {
            after: onMove,
          },
        },
      };

      apiRef.current = Chessground(boardRef.current, finalConfig);
    }

    return () => {
      if (apiRef.current) {
        apiRef.current.destroy();
      }
    };
  }, []);

  useEffect(() => {
    if (apiRef.current) {
      apiRef.current.set(config);
    }
  }, [config]);

  return <div ref={boardRef} className="chess-board" />;
};

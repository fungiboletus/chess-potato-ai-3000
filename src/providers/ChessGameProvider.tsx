import React, { createContext, useContext, useEffect } from 'react';
import type { ReactNode } from 'react';
import useChessStore from '../stores/chessStore';
import { mcpClient } from '../services/mcpClient';

interface ChessGameProviderProps {
  children: ReactNode;
}

const ChessGameContext = createContext<boolean>(false);

export const ChessGameProvider: React.FC<ChessGameProviderProps> = ({ children }) => {
  const initializeGame = useChessStore(state => state.initializeGame);

  useEffect(() => {
    // Initialize the game when the provider mounts
    initializeGame();

    // Cleanup: disconnect from MCP server on unmount
    return () => {
      mcpClient.disconnect().catch((error) => {
        console.error('[MCP] Error disconnecting:', error);
      });
    };
  }, [initializeGame]);

  return (
    <ChessGameContext.Provider value={true}>
      {children}
    </ChessGameContext.Provider>
  );
};

export const useChessGameContext = () => {
  const context = useContext(ChessGameContext);
  if (!context) {
    throw new Error('useChessGameContext must be used within a ChessGameProvider');
  }
  return context;
};

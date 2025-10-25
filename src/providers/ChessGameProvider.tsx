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
  const fetchEngines = useChessStore(state => state.fetchEngines);
  const engineFetchState = useChessStore(state => state.engineFetchState);

  // Fetch engines on mount
  useEffect(() => {
    fetchEngines();

    // Cleanup: disconnect from MCP server on unmount
    return () => {
      mcpClient.disconnect().catch((error) => {
        console.error('[MCP] Error disconnecting:', error);
      });
    };
  }, [fetchEngines]);

  // Initialize game only after engines are loaded (success or error)
  useEffect(() => {
    if (engineFetchState === 'success' || engineFetchState === 'error') {
      console.log('[Provider] Engines ready, initializing game...');
      initializeGame();
    }
  }, [engineFetchState, initializeGame]);

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

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
  const setSelectedEngine = useChessStore(state => state.setSelectedEngine);
  const setEngineLocked = useChessStore(state => state.setEngineLocked);
  const availableEngines = useChessStore(state => state.availableEngines);

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

  // Apply URL parameters after engines are fetched
  useEffect(() => {
    if (engineFetchState === 'success' || engineFetchState === 'error') {
      // Parse URL parameters
      const params = new URLSearchParams(window.location.search);
      const engineParam = params.get('engine');
      const lockEngineParam = params.get('lockEngine');

      // Check if engine should be locked
      const shouldLockEngine = lockEngineParam === 'true';

      // If engine parameter is provided, validate and set it
      if (engineParam) {
        const engineExists = availableEngines.some(e => e.name === engineParam);

        if (engineExists) {
          console.log('[Provider] Setting engine from URL parameter:', engineParam);
          // Temporarily bypass the lock check by setting the engine directly in the store
          useChessStore.setState({ selectedEngine: engineParam });
          localStorage.setItem('selected-engine', engineParam);
        } else {
          console.warn('[Provider] Engine from URL parameter not found:', engineParam);
        }
      }

      // Set the lock state after setting the engine
      if (shouldLockEngine) {
        console.log('[Provider] Locking engine selection');
        setEngineLocked(true);
      }
    }
  }, [engineFetchState, availableEngines, setSelectedEngine, setEngineLocked]);

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

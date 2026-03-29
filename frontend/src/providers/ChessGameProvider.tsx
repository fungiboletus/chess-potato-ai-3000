import React, { useEffect } from 'react';
import type { ReactNode } from 'react';
import useChessStore from '../stores/chessStore';
import { mcpClient } from '../services/mcpClient';
import { ChessGameContext } from '../contexts/ChessGameContext';

interface ChessGameProviderProps {
  children: ReactNode;
}

export const ChessGameProvider: React.FC<ChessGameProviderProps> = ({ children }) => {
  const initializeGame = useChessStore(state => state.initializeGame);
  const fetchEngines = useChessStore(state => state.fetchEngines);
  const engineFetchState = useChessStore(state => state.engineFetchState);
  const setEngineLocked = useChessStore(state => state.setEngineLocked);
  const availableEngines = useChessStore(state => state.availableEngines);

  // Fetch engines after persisted state rehydrates
  useEffect(() => {
    let isActive = true;
    let hasFetched = false;

    const runFetchOnce = () => {
      if (!isActive || hasFetched) {
        return;
      }
      hasFetched = true;
      fetchEngines();
    };

    const hasHydrated = useChessStore.persist.hasHydrated();
    const unsubscribe = hasHydrated
      ? undefined
      : useChessStore.persist.onFinishHydration(runFetchOnce);

    if (hasHydrated) {
      runFetchOnce();
    }

    // Cleanup: unsubscribe hydration listener and disconnect MCP on unmount
    return () => {
      isActive = false;
      unsubscribe?.();
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
  }, [engineFetchState, availableEngines, setEngineLocked]);

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

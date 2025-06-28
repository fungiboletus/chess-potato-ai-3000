import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import useChessStore from '../stores/chessStore';

interface ChessGameProviderProps {
  children: ReactNode;
}

const ChessGameContext = createContext<boolean>(false);

export const ChessGameProvider: React.FC<ChessGameProviderProps> = ({ children }) => {
  const initializeGame = useChessStore(state => state.initializeGame);

  useEffect(() => {
    // Initialize the game when the provider mounts
    initializeGame();
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

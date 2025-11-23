import { useContext } from 'react';
import { ChessGameContext } from '../contexts/ChessGameContext';

export const useChessGameContext = () => {
  const context = useContext(ChessGameContext);
  if (!context) {
    throw new Error('useChessGameContext must be used within a ChessGameProvider');
  }
  return context;
};

import { useState, useEffect, useCallback } from 'react';
import { Chess } from 'chess.js';
import type { Config } from 'chessground/config';
import { ChessBoard } from './ChessBoard';

type PlayerColor = 'white' | 'black';

export const ChessGame: React.FC = () => {
  const [chess] = useState(() => new Chess());
  const [playerColor, setPlayerColor] = useState<PlayerColor>('white');
  const [gameStatus, setGameStatus] = useState<string>('Starting...');
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);

  // Get legal moves for current position
  const getLegalMoves = useCallback(() => {
    const moves = chess.moves({ verbose: true });
    const legalMoves = new Map<string, string[]>();
    
    moves.forEach(move => {
      const fromSquare = move.from;
      if (!legalMoves.has(fromSquare)) {
        legalMoves.set(fromSquare, []);
      }
      legalMoves.get(fromSquare)!.push(move.to);
    });
    
    return legalMoves;
  }, [chess]);

  // Handle player moves
  const handleMove = useCallback((from: string, to: string) => {
    if (!isPlayerTurn) return;

    try {
      const move = chess.move({ from, to, promotion: 'q' });
      if (move) {
        setIsPlayerTurn(false);
        updateGameStatus();
        
        // Schedule AI move after a short delay
        setTimeout(() => {
          makeAIMove();
        }, 500);
      }
    } catch (error) {
      console.error('Invalid move:', error);
    }
  }, [chess, isPlayerTurn]);

  // Simple random AI move
  const makeAIMove = useCallback(() => {
    if (chess.isGameOver()) return;

    const moves = chess.moves({ verbose: true });
    if (moves.length === 0) return;

    const randomMove = moves[Math.floor(Math.random() * moves.length)];
    chess.move(randomMove);
    setIsPlayerTurn(true);
    updateGameStatus();
  }, [chess]);

  // Update game status text
  const updateGameStatus = useCallback(() => {
    if (chess.isCheckmate()) {
      const winner = chess.turn() === 'w' ? 'Black' : 'White';
      setGameStatus(`Checkmate! ${winner} wins!`);
    } else if (chess.isDraw()) {
      setGameStatus('Game is a draw!');
    } else if (chess.isCheck()) {
      setGameStatus('Check!');
    } else {
      const turn = chess.turn() === 'w' ? 'White' : 'Black';
      setGameStatus(`${turn} to move`);
    }
  }, [chess]);

  // Initialize game with random color
  useEffect(() => {
    const randomColor: PlayerColor = Math.random() < 0.5 ? 'white' : 'black';
    setPlayerColor(randomColor);
    
    if (randomColor === 'black') {
      setIsPlayerTurn(false);
      setGameStatus('AI is thinking...');
      setTimeout(() => {
        makeAIMove();
      }, 1000);
    } else {
      setGameStatus('Your turn (White)');
    }
  }, [makeAIMove]);

  // Chessground configuration
  const boardConfig: Config = {
    fen: chess.fen(),
    orientation: playerColor,
    turnColor: chess.turn() === 'w' ? 'white' : 'black',
    movable: {
      color: isPlayerTurn ? playerColor : undefined,
      free: false,
      dests: isPlayerTurn ? getLegalMoves() : new Map(),
    },
    check: chess.isCheck(),
  };

  const handleNewGame = () => {
    chess.reset();
    const randomColor: PlayerColor = Math.random() < 0.5 ? 'white' : 'black';
    setPlayerColor(randomColor);
    setIsPlayerTurn(randomColor === 'white');
    
    if (randomColor === 'black') {
      setGameStatus('AI is thinking...');
      setTimeout(() => {
        makeAIMove();
      }, 1000);
    } else {
      setGameStatus('Your turn (White)');
    }
  };

  return (
    <div className="window" style={{ width: '100%', maxWidth: '600px', margin: '0 auto' }}>
      <div className="title-bar">
        <div className="title-bar-text">Chess Potato AI 3000</div>
        <div className="title-bar-controls">
          <button aria-label="Minimize"></button>
          <button aria-label="Maximize"></button>
          <button aria-label="Close"></button>
        </div>
      </div>
      <div className="window-body">
        <div className="chess-container">
          <div className="game-status">
            <p>Playing as: <strong>{playerColor}</strong></p>
            <p>Status: {gameStatus}</p>
          </div>
          
          <div className="chess-board-wrapper">
            <ChessBoard 
              config={boardConfig}
              onMove={handleMove}
            />
          </div>
          
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
            <button onClick={handleNewGame}>New Game</button>
            <button onClick={() => setGameStatus(`FEN: ${chess.fen()}`)}>
              Show FEN
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

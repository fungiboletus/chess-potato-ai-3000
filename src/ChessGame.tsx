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
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [gameStarted, setGameStarted] = useState(false);

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
    if (!isPlayerTurn || isAIThinking) return;

    try {
      const move = chess.move({ from, to, promotion: 'q' });
      if (move) {
        setGameStarted(true);
        setMoveHistory(prev => [...prev, move.san]);
        setIsPlayerTurn(false);
        setIsAIThinking(true);
        updateGameStatus();
        
        // Schedule AI move after a short delay
        setTimeout(() => {
          makeAIMove();
        }, 800);
      }
    } catch (error) {
      console.error('Invalid move:', error);
    }
  }, [chess, isPlayerTurn, isAIThinking]);

  // Simple random AI move
  const makeAIMove = useCallback(() => {
    if (chess.isGameOver()) {
      setIsAIThinking(false);
      return;
    }

    const moves = chess.moves({ verbose: true });
    if (moves.length === 0) {
      setIsAIThinking(false);
      return;
    }

    const randomMove = moves[Math.floor(Math.random() * moves.length)];
    const move = chess.move(randomMove);
    setMoveHistory(prev => [...prev, move.san]);
    setIsPlayerTurn(true);
    setIsAIThinking(false);
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
    setIsPlayerTurn(randomColor === 'white');
    
    if (randomColor === 'black') {
      setGameStatus('AI is thinking...');
      setIsAIThinking(true);
      setTimeout(() => {
        makeAIMove();
      }, 1000);
    } else {
      setGameStatus('Your turn (White)');
      setIsAIThinking(false);
    }
  }, [makeAIMove]);

  // Chessground configuration
  const boardConfig: Config = {
    fen: chess.fen(),
    orientation: playerColor,
    turnColor: chess.turn() === 'w' ? 'white' : 'black',
    movable: {
      color: isPlayerTurn && !isAIThinking ? playerColor : undefined,
      free: false,
      dests: isPlayerTurn && !isAIThinking ? getLegalMoves() : new Map(),
    },
    check: chess.isCheck(),
  };

  const handleNewGame = () => {
    chess.reset();
    setMoveHistory([]);
    setGameStarted(false);
    setIsAIThinking(false);
    const randomColor: PlayerColor = Math.random() < 0.5 ? 'white' : 'black';
    setPlayerColor(randomColor);
    setIsPlayerTurn(randomColor === 'white');
    
    if (randomColor === 'black') {
      setGameStatus('AI is thinking...');
      setIsAIThinking(true);
      setTimeout(() => {
        makeAIMove();
      }, 1000);
    } else {
      setGameStatus('Your turn (White)');
    }
  };

  const handleResign = () => {
    setGameStatus(`You resigned! ${playerColor === 'white' ? 'Black' : 'White'} wins!`);
    setIsPlayerTurn(false);
    setIsAIThinking(false);
  };

  const formatMoveHistory = () => {
    if (moveHistory.length === 0) return 'No moves yet...';
    
    let formatted = '';
    for (let i = 0; i < moveHistory.length; i += 2) {
      const moveNumber = Math.floor(i / 2) + 1;
      const whiteMove = moveHistory[i] || '';
      const blackMove = moveHistory[i + 1] || '';
      formatted += `${moveNumber}. ${whiteMove}`;
      if (blackMove) {
        formatted += ` ${blackMove}`;
      }
      formatted += '\n';
    }
    return formatted.trim();
  };

  return (
    <div className="window" style={{ width: '100%', maxWidth: '600px', margin: '0 auto' }}>
      <div className="title-bar">
        <div className="title-bar-text">Chess Potato AI 3000</div>
      </div>
      <div className="window-body">
        <div className="chess-container">
          <div className="progress-container">
            <div className={`progress-indicator ai-progress ${!isAIThinking ? 'hidden' : ''}`}>
              <div className="progress-indicator-bar" style={{ width: '100%' }} />
            </div>
          </div>
          
          <div className="chess-board-wrapper">
            <ChessBoard 
              config={boardConfig}
              onMove={handleMove}
            />
          </div>
          
          <div className="move-history">
            {formatMoveHistory()}
          </div>
          
          <div className="game-controls">
            <button onClick={handleNewGame}>New Game</button>
            <button onClick={handleResign} disabled={!gameStarted}>
              Resign
            </button>
          </div>
        </div>
      </div>
      <div className="status-bar">
        <p className="status-bar-field">Playing as: {playerColor}</p>
        <p className="status-bar-field">{gameStatus}</p>
        <p className="status-bar-field">Moves: {moveHistory.length}</p>
      </div>
    </div>
  );
};

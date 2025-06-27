import { useState, useEffect, useCallback } from 'react';
import { Chess } from 'chess.js';
import type { Config } from 'chessground/config';
import { ChessBoard } from './ChessBoard';
import { AnimatedProgressBar } from './components/AnimatedProgressBar';
import { MoveHistoryWindow } from './components/MoveHistoryWindow';
import { GameResultWindow } from './components/GameResultWindow';
import { HelpWindow } from './components/HelpWindow';

type PlayerColor = 'white' | 'black';

export const ChessGame: React.FC = () => {
  const [chess] = useState(() => new Chess());
  const [playerColor, setPlayerColor] = useState<PlayerColor>('white');
  const [gameStatus, setGameStatus] = useState<string>('Starting...');
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [gameStarted, setGameStarted] = useState(false);
  const [showMoveHistory, setShowMoveHistory] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [gameResult, setGameResult] = useState<{
    show: boolean;
    type: 'win' | 'lose' | 'draw';
    message: string;
  }>({ show: false, type: 'win', message: '' });

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

  // Check if it's the player's turn (simple logic)
  const isPlayerTurn = () => {
    if (chess.isGameOver() || isAIThinking) return false;
    return (chess.turn() === 'w' && playerColor === 'white') ||
      (chess.turn() === 'b' && playerColor === 'black');
  };

  // Update game status after any move
  const updateGameStatus = () => {
    if (chess.isCheckmate()) {
      const winner = chess.turn() === 'w' ? 'Black' : 'White';
      const isPlayerWin = (winner === 'White' && playerColor === 'white') ||
        (winner === 'Black' && playerColor === 'black');

      setGameStatus(`Checkmate! ${winner} wins!`);
      setGameResult({
        show: true,
        type: isPlayerWin ? 'win' : 'lose',
        message: isPlayerWin ? 'Congratulations! You won!' : 'Better luck next time!',
      });
      return;
    }

    if (chess.isDraw()) {
      setGameStatus('Game is a draw!');
      setGameResult({
        show: true,
        type: 'draw',
        message: 'It\'s a draw! Well played!',
      });
      return;
    }

    if (chess.isCheck()) {
      setGameStatus('Check!');
      return;
    }

    const turn = chess.turn() === 'w' ? 'White' : 'Black';
    if (isPlayerTurn()) {
      setGameStatus(`Your turn (${playerColor})`);
    } else {
      setGameStatus(`${turn} to move`);
    }
  };

  // Make AI move
  const makeAIMove = () => {
    if (chess.isGameOver() || isPlayerTurn()) return;

    setIsAIThinking(true);
    setGameStatus('AI is thinking...');

    setTimeout(() => {
      const moves = chess.moves({ verbose: true });
      if (moves.length > 0) {
        const randomMove = moves[Math.floor(Math.random() * moves.length)];
        const move = chess.move(randomMove);
        setMoveHistory(prev => [...prev, move.san]);
        setGameStarted(true);
      }

      setIsAIThinking(false);
      updateGameStatus();
    }, 800);
  };

  // Handle player moves
  const handleMove = useCallback((from: string, to: string) => {
    if (!isPlayerTurn() || isAIThinking) return;

    try {
      const move = chess.move({ from, to, promotion: 'q' });
      if (move) {
        setGameStarted(true);
        setMoveHistory(prev => [...prev, move.san]);
        updateGameStatus();

        // Schedule AI move if game isn't over
        if (!chess.isGameOver()) {
          setTimeout(() => makeAIMove(), 100);
        }
      }
    } catch (error) {
      console.error('Invalid move:', error);
    }
  }, [chess, playerColor, isAIThinking]);

  // Initialize game
  const initializeGame = (color: PlayerColor) => {
    setPlayerColor(color);
    setMoveHistory([]);
    setGameStarted(false);
    setIsAIThinking(false);
    setGameResult({ show: false, type: 'win', message: '' });

    if (color === 'black') {
      // AI plays first
      setTimeout(() => makeAIMove(), 1000);
    } else {
      setGameStatus('Your turn (White)');
    }
  };

  // Start new game
  const handleNewGame = () => {
    chess.reset();
    const randomColor: PlayerColor = Math.random() < 0.5 ? 'white' : 'black';
    initializeGame(randomColor);
  };

  // Initialize on mount
  useEffect(() => {
    const randomColor: PlayerColor = Math.random() < 0.5 ? 'white' : 'black';
    initializeGame(randomColor);
  }, []);

  const handleResign = () => {
    const winnerColor = playerColor === 'white' ? 'Black' : 'White';
    setGameStatus(`You resigned! ${winnerColor} wins!`);
    setGameResult({
      show: true,
      type: 'lose',
      message: 'You resigned the game!',
    });
  };

  // Chessground configuration
  const boardConfig: Config = {
    fen: chess.fen(),
    orientation: playerColor,
    turnColor: chess.turn() === 'w' ? 'white' : 'black',
    movable: {
      color: isPlayerTurn() ? playerColor : undefined,
      free: false,
      dests: isPlayerTurn() ? getLegalMoves() : new Map(),
    },
    check: chess.isCheck(),
  };

  return (
    <div className="draggable-window-container">
      <div className="window" style={{ width: '100%', maxWidth: '600px', margin: '0 auto' }}>
        <div className="title-bar">
          <div className="title-bar-text">Chess Potato AI 3000</div>
        </div>
        <div className="window-body">
          <div className="chess-container">
            <div className="progress-container">
              {isAIThinking && (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <div style={{
                    fontSize: '11px',
                    fontFamily: 'MS Sans Serif, sans-serif',
                    color: '#000080',
                    fontWeight: 'bold'
                  }}>
                    🤖 AI is thinking...
                  </div>
                  <AnimatedProgressBar isVisible={isAIThinking} width={200} height={16} />
                </div>
              )}
              {!isAIThinking && <div style={{ height: '40px' }} />}
            </div>

            <div className="chess-board-wrapper">
              <ChessBoard
                config={boardConfig}
                onMove={handleMove}
              />
            </div>

            <div className="game-controls">
              <button onClick={handleNewGame}>New Game</button>
              <button onClick={handleResign} disabled={!gameStarted}>
                Resign
              </button>
              <button onClick={() => setShowMoveHistory(true)}>
                Show Moves
              </button>
              <button onClick={() => setShowHelp(true)}>
                Help
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

      <MoveHistoryWindow
        isOpen={showMoveHistory}
        onClose={() => setShowMoveHistory(false)}
        moveHistory={moveHistory}
      />

      <GameResultWindow
        isOpen={gameResult.show}
        onClose={() => setGameResult({ ...gameResult, show: false })}
        result={gameResult.type}
        message={gameResult.message}
      />

      <HelpWindow
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
      />
    </div>
  );
};

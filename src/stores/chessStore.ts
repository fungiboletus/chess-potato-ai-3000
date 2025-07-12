import { create } from 'zustand';
import { Chess } from 'chess.js';
import type { Api } from 'chessground/api';

// Game states following a state machine pattern
export type GameState =
  | 'initializing'
  | 'player_turn'
  | 'ai_turn'
  | 'ai_thinking'
  | 'game_over';

export type PlayerColor = 'white' | 'black';

export interface GameResult {
  type: 'win' | 'lose' | 'draw';
  message: string;
  reason: string;
}

export interface ChessGameStore {
  // Core game state
  chess: Chess;
  gameState: GameState;
  playerColor: PlayerColor;
  gameStarted: boolean;

  // Move tracking
  moveHistory: string[];

  // Game result
  gameResult: GameResult | null;

  // UI state
  showMoveHistory: boolean;
  showHelp: boolean;
  showHelpLast: boolean; // Whether help or move history was last shown
  showLanguageWindow: boolean;

  // Computed state
  isPlayerTurn: boolean;
  legalMoves: Map<string, string[]>;
  currentFen: string;

  // Chessground API reference
  chessgroundApi: Api | null;

  // Actions
  initializeGame: (color?: PlayerColor) => void;
  makePlayerMove: (from: string, to: string) => boolean;
  makeAIMove: () => void;
  resetGame: () => void;
  resignGame: () => void;

  // UI actions
  setShowMoveHistory: (show: boolean) => void;
  setShowHelp: (show: boolean) => void;
  setShowHelpLast: (show: boolean) => void;
  setShowLanguageWindow: (show: boolean) => void;
  closeGameResult: () => void;

  // Chessground integration
  setChessgroundApi: (api: Api | null) => void;
  redrawChessground: () => void;

  // Internal helpers
  calculateLegalMoves: () => Map<string, string[]>;
  checkGameEnd: () => GameResult | null;
  updateTurnState: () => void;
}

// Internal variable to track AI move timeout
let aiMoveTimeout: ReturnType<typeof setTimeout> | null = null;

const useChessStore = create<ChessGameStore>((set, get) => ({
  // Initial state
  chess: new Chess(),
  gameState: 'initializing',
  playerColor: 'white',
  gameStarted: false,
  moveHistory: [],
  gameResult: null,
  showMoveHistory: false,
  showHelp: false,
  showHelpLast: false,
  showLanguageWindow: false,
  isPlayerTurn: false,
  legalMoves: new Map(),
  chessgroundApi: null,
  currentFen: '',

  // Calculate legal moves for the current position
  calculateLegalMoves: () => {
    const { chess } = get();
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
  },

  // Check if the game has ended and return result
  checkGameEnd: () => {
    const { chess, playerColor } = get();

    if (!chess.isGameOver()) {
      return null;
    }

    if (chess.isCheckmate()) {
      const winner = chess.turn() === 'w' ? 'Black' : 'White';
      const isPlayerWin = (winner === 'White' && playerColor === 'white') ||
        (winner === 'Black' && playerColor === 'black');

      return {
        type: isPlayerWin ? 'win' : 'lose',
        message: isPlayerWin ? 'Congratulations! You won!' : 'Better luck next time!',
        reason: 'checkmate'
      } as GameResult;
    }

    if (chess.isDraw()) {
      return {
        type: 'draw',
        message: "It's a draw! Well played!",
        reason: chess.isStalemate() ? 'stalemate' :
          chess.isThreefoldRepetition() ? 'threefold repetition' :
            chess.isInsufficientMaterial() ? 'insufficient material' : 'fifty-move rule'
      } as GameResult;
    }

    return null;
  },

  // Update turn-based state after any move
  updateTurnState: () => {
    const state = get();
    const { chess, playerColor } = state;

    // First check if game is over
    const gameResult = state.checkGameEnd();
    if (gameResult) {
      set({
        gameState: 'game_over',
        gameResult,
        isPlayerTurn: false,
        legalMoves: new Map()
      });
      return;
    }

    // Game is ongoing - determine whose turn it is
    const currentTurn = chess.turn(); // 'w' or 'b'
    const isPlayerColorTurn = (currentTurn === 'w' && playerColor === 'white') ||
      (currentTurn === 'b' && playerColor === 'black');

    // Always clear any pending AI move timeout before proceeding
    if (aiMoveTimeout) {
      clearTimeout(aiMoveTimeout);
      aiMoveTimeout = null;
    }

    if (isPlayerColorTurn) {
      // It's the player's turn
      set({
        gameState: 'player_turn',
        isPlayerTurn: true,
        legalMoves: state.calculateLegalMoves()
      });
    } else {
      // It's the AI's turn
      set({
        gameState: 'ai_turn',
        isPlayerTurn: false,
        legalMoves: new Map()
      });
      // Now, schedule the AI move
      get().makeAIMove();
    }
  },

  // Initialize a new game
  initializeGame: (color?: PlayerColor) => {
    // Clear any pending AI move timeout
    if (aiMoveTimeout) {
      clearTimeout(aiMoveTimeout);
      aiMoveTimeout = null;
    }

    const newColor = color || (Math.random() < 0.5 ? 'white' : 'black');
    const chess = new Chess();

    set({
      chess,
      playerColor: newColor,
      gameStarted: false,
      moveHistory: [],
      gameResult: null,
      gameState: 'initializing',
      isPlayerTurn: false,
      legalMoves: new Map(),
    });

    // Update turn state after initialization
    setTimeout(() => {
      get().updateTurnState();
    }, 0);
  },

  // Make a player move
  makePlayerMove: (from: string, to: string) => {
    const { chess, gameState, isPlayerTurn } = get();

    // Validate that it's the player's turn
    if (gameState !== 'player_turn' || !isPlayerTurn) {
      console.log('Not player turn:', { gameState, isPlayerTurn });
      return false;
    }

    try {
      const move = chess.move({ from, to, promotion: 'q' });
      if (move) {
        set(state => ({
          moveHistory: [...state.moveHistory, move.san],
          gameStarted: true
        }));

        // Update turn state after move
        get().updateTurnState();
        return true;
      }
    } catch (error) {
      console.error('Invalid move:', error);
    }

    return false;
  },

  // Make an AI move
  makeAIMove: () => {
    const { gameState } = get();

    // Only make AI move if it's AI's turn
    if (gameState !== 'ai_turn') {
      if (aiMoveTimeout) {
        clearTimeout(aiMoveTimeout);
        aiMoveTimeout = null;
      }
      console.log('Not AI turn:', gameState);
      return;
    }

    set({
      gameState: 'ai_thinking'
    });

    // Only allow one AI move timeout at a time
    if (aiMoveTimeout) {
      clearTimeout(aiMoveTimeout);
      aiMoveTimeout = null;
    }
    aiMoveTimeout = setTimeout(() => {
      aiMoveTimeout = null;
      const currentState = get();
      const moves = currentState.chess.moves({ verbose: true });

      if (moves.length > 0) {
        const randomMove = moves[Math.floor(Math.random() * moves.length)];
        const move = currentState.chess.move(randomMove);

        if (move) {
          set(state => ({
            moveHistory: [...state.moveHistory, move.san],
            gameStarted: true
          }));
        }
      }

      // Update turn state after AI move
      get().updateTurnState();
    }, 800);
  },

  // Reset the current game
  resetGame: () => {
    const newColor = Math.random() < 0.5 ? 'white' : 'black';
    get().initializeGame(newColor);
  },

  // Resign the current game
  resignGame: () => {
    set({
      gameState: 'game_over',
      gameResult: {
        type: 'lose',
        message: 'You resigned the game!',
        reason: 'resignation'
      },
      isPlayerTurn: false,
      legalMoves: new Map()
    });
  },

  // UI state setters
  setShowMoveHistory: (show: boolean) => set({ showMoveHistory: show, showHelpLast: false }),
  setShowHelp: (show: boolean) => set({ showHelp: show, showHelpLast: show }),
  setShowHelpLast: (show: boolean) => set({ showHelpLast: show }),
  setShowLanguageWindow: (show: boolean) => set({ showLanguageWindow: show }),
  closeGameResult: () => set({ gameResult: null }),

  // Chessground integration
  setChessgroundApi: (api: Api | null) => set({ chessgroundApi: api }),
  redrawChessground: () => {
    const { chessgroundApi } = get();
    if (chessgroundApi) {
      chessgroundApi.redrawAll();
    }
  },
}));

export default useChessStore;

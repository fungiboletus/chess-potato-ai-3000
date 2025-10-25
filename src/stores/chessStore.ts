import { create } from 'zustand';
import { Chess } from 'chess.js';
import type { Api } from 'chessground/api';
import { mcpClient, type EngineInfo } from '../services/mcpClient';
import { computeRandomMove } from '../utils/offlineEngine';

// Game states following a state machine pattern
export type GameState =
  | 'initializing'
  | 'player_turn'
  | 'ai_turn'
  | 'ai_thinking'
  | 'game_over';

export type PlayerColor = 'white' | 'black';

export type EngineFetchState = 'idle' | 'loading' | 'success' | 'error';

export interface GameResult {
  type: 'win' | 'lose' | 'draw';
  message: string;
  reason: string;
}

export interface MoveRecord {
  san: string;        // Standard Algebraic Notation (e.g., "e4")
  playerKey: string;  // Engine key or "human"
  eval: string;       // Evaluation (hardcoded to "-" for now)
}

// Special offline engine constant
export const OFFLINE_ENGINE = 'offline-random';

export interface ChessGameStore {
  // Core game state
  chess: Chess;
  gameState: GameState;
  playerColor: PlayerColor;
  gameStarted: boolean;

  // Move tracking
  moveHistory: MoveRecord[];

  // Game result
  gameResult: GameResult | null;

  // UI state
  showMoveHistory: boolean;
  showHelp: boolean;
  showHelpLast: boolean; // Whether help or move history was last shown
  showLanguageWindow: boolean;
  showEngineWindow: boolean;

  // Engine state
  selectedEngine: string | null;
  availableEngines: EngineInfo[];
  engineFetchState: EngineFetchState;

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
  setShowEngineWindow: (show: boolean) => void;
  closeGameResult: () => void;

  // Engine actions
  fetchEngines: () => Promise<void>;
  setSelectedEngine: (engineName: string) => void;

  // Chessground integration
  setChessgroundApi: (api: Api | null) => void;
  redrawChessground: () => void;

  // Internal helpers
  calculateLegalMoves: () => Map<string, string[]>;
  checkGameEnd: () => GameResult | null;
  updateTurnState: () => void;
  getSelectedEngineDisplayName: () => string;
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
  showEngineWindow: false,
  isPlayerTurn: false,
  legalMoves: new Map(),
  chessgroundApi: null,
  currentFen: '',
  selectedEngine: null,
  availableEngines: [],
  engineFetchState: 'idle',

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

    // Reset MCP token for the new game
    mcpClient.resetToken();

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
        const moveRecord: MoveRecord = {
          san: move.san,
          playerKey: 'human',
          eval: '-'
        };
        set(state => ({
          moveHistory: [...state.moveHistory, moveRecord],
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

  // Make an AI move using MCP service
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

    // Use async function to handle MCP call
    const computeMove = async () => {
      try {
        const currentState = get();

        // Guard: Only process AI move if game is still in AI thinking state
        if (currentState.gameState !== 'ai_thinking') {
          console.log('AI move cancelled, game state changed to:', currentState.gameState);
          return;
        }

        // Get current position in FEN format
        const fen = currentState.chess.fen();
        console.log('[AI] Computing move for FEN:', fen);

        // Determine which engine to use
        const engineToUse = currentState.selectedEngine || OFFLINE_ENGINE;
        let uciMove: string;

        // If using offline engine or selectedEngine is the offline engine, use random move
        if (engineToUse === OFFLINE_ENGINE) {
          console.log('[AI] Using offline random engine');
          uciMove = computeRandomMove(currentState.chess);
        } else {
          // Call MCP service to get the best move
          try {
            uciMove = await mcpClient.computeNextMove(fen, engineToUse);
            console.log('[AI] MCP returned move:', uciMove);
          } catch (mcpError) {
            console.warn('[AI] MCP failed, falling back to offline engine:', mcpError);
            uciMove = computeRandomMove(currentState.chess);
          }
        }

        // Check state again after async operation
        const stateAfterMCP = get();
        if (stateAfterMCP.gameState !== 'ai_thinking') {
          console.log('AI move cancelled after MCP call');
          return;
        }

        // Parse UCI move (e.g., "e2e4" or "e7e8q" for promotion)
        const from = uciMove.slice(0, 2);
        const to = uciMove.slice(2, 4);
        const promotion = uciMove.length > 4 ? uciMove[4] : 'q'; // default to queen

        // Make the move
        const move = stateAfterMCP.chess.move({
          from,
          to,
          promotion
        });

        if (move) {
          console.log('[AI] Move executed:', move.san);
          const moveRecord: MoveRecord = {
            san: move.san,
            playerKey: engineToUse,
            eval: '-'
          };
          set(state => ({
            moveHistory: [...state.moveHistory, moveRecord],
            gameStarted: true
          }));

          // Update turn state after AI move
          get().updateTurnState();
        } else {
          console.error('[AI] Invalid move from MCP:', uciMove);
          // Fallback to random move
          throw new Error('Invalid move from MCP');
        }

      } catch (error) {
        console.error('[AI] Unexpected error computing move:', error);

        // Last resort fallback: use random move if we haven't made a move yet
        const currentState = get();
        if (currentState.gameState !== 'ai_thinking') {
          return;
        }

        console.log('[AI] Last resort: falling back to random move');
        try {
          const uciMove = computeRandomMove(currentState.chess);
          const from = uciMove.slice(0, 2);
          const to = uciMove.slice(2, 4);
          const promotion = uciMove.length > 4 ? uciMove[4] : 'q';

          const move = currentState.chess.move({ from, to, promotion });
          if (move) {
            const moveRecord: MoveRecord = {
              san: move.san,
              playerKey: OFFLINE_ENGINE,
              eval: '-'
            };
            set(state => ({
              moveHistory: [...state.moveHistory, moveRecord],
              gameStarted: true
            }));
          }
        } catch (fallbackError) {
          console.error('[AI] Failed to compute fallback move:', fallbackError);
        }

        // Update turn state after error handling
        get().updateTurnState();
      }
    };

    // Add a small delay to make the AI feel more natural
    aiMoveTimeout = setTimeout(() => {
      aiMoveTimeout = null;
      computeMove();
    }, 500);
  },

  // Reset the current game
  resetGame: () => {
    const newColor = get().playerColor === 'white' ? 'black' : 'white';
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
  setShowEngineWindow: (show: boolean) => set({ showEngineWindow: show }),
  closeGameResult: () => set({ gameResult: null }),

  // Chessground integration
  setChessgroundApi: (api: Api | null) => set({ chessgroundApi: api }),
  redrawChessground: () => {
    const { chessgroundApi } = get();
    if (chessgroundApi) {
      chessgroundApi.redrawAll();
    }
  },

  // Engine management
  fetchEngines: async () => {
    set({ engineFetchState: 'loading' });

    try {
      console.log('[Store] Fetching available engines...');
      const engines = await mcpClient.listEngines();

      // Find the default engine
      const defaultEngine = engines.find(e => e.default);

      // Try to get persisted engine from localStorage
      const persistedEngine = localStorage.getItem('selected-engine');

      // Determine which engine to use
      let engineToSelect: string;

      if (persistedEngine && engines.some(e => e.name === persistedEngine)) {
        // Use persisted engine if it exists in the list
        engineToSelect = persistedEngine;
        console.log('[Store] Using persisted engine:', engineToSelect);
      } else if (defaultEngine) {
        // Use default engine from server
        engineToSelect = defaultEngine.name;
        console.log('[Store] Using default engine:', engineToSelect);
      } else if (engines.length > 0) {
        // Fallback to first engine if no default specified
        engineToSelect = engines[0].name;
        console.log('[Store] Using first available engine:', engineToSelect);
      } else {
        // No engines available - use offline
        engineToSelect = OFFLINE_ENGINE;
        console.log('[Store] No engines available, using offline engine');
      }

      // Update state
      set({
        availableEngines: engines,
        selectedEngine: engineToSelect,
        engineFetchState: 'success'
      });

      // Persist the selection
      localStorage.setItem('selected-engine', engineToSelect);

      console.log(`[Store] Successfully loaded ${engines.length} engines`);
    } catch (error) {
      console.error('[Store] Failed to fetch engines:', error);

      // Fall back to offline engine
      set({
        availableEngines: [],
        selectedEngine: OFFLINE_ENGINE,
        engineFetchState: 'error'
      });

      localStorage.setItem('selected-engine', OFFLINE_ENGINE);
    }
  },

  setSelectedEngine: (engineName: string) => {
    console.log('[Store] Switching to engine:', engineName);
    set({ selectedEngine: engineName });
    localStorage.setItem('selected-engine', engineName);
  },

  getSelectedEngineDisplayName: () => {
    const { selectedEngine, availableEngines } = get();
    const engineInfo = availableEngines.find(e => e.name === selectedEngine);
    return engineInfo?.display_name || 'Untitled Engine';
  },
}));

export default useChessStore;

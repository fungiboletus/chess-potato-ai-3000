import { create } from 'zustand';
import { Chess } from 'chess.js';
import type { Api } from 'chessground/api';
import { mcpClient, type EngineInfo, type PositionEvaluation } from '../services/mcpClient';
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
  fen: string;        // Position after this move
  evaluationToken?: string | null; // Token associated with the position for MCP evaluations
  timestamp: number;  // Unix timestamp (ms) when the move was recorded
  continuationToken?: string | null; // Engine continuation token after this move (AI moves only)
}

// Special offline engine constant
export const OFFLINE_ENGINE = 'offline-random';

export type PositionEvaluationStatus = 'loading' | 'success' | 'error' | 'offline';

export interface PositionEvaluationState {
  status: PositionEvaluationStatus;
  data?: PositionEvaluation;
  error?: string;
}

export interface ChessGameStore {
  // Core game state
  chess: Chess;
  gameState: GameState;
  playerColor: PlayerColor;
  gameStarted: boolean;

  // Move tracking
  moveHistory: MoveRecord[];
  positionEvaluations: Record<string, PositionEvaluationState>;
  lastMoveAt: number | null;
  engineContinuationToken: string | null;
  hasUsedTakeback: boolean;

  // Rewind mode (for reviewing past positions)
  rewindMode: {
    active: boolean;
    moveIndex: number;
    fen: string;
  } | null;

  // Game result
  gameResult: GameResult | null;

  // UI state
  showMoveHistory: boolean;
  showHelp: boolean;
  showLanguageWindow: boolean;
  showEngineWindow: boolean;
  showThemeWindow: boolean;
  moveHistoryFocusRequestId: number;

  // Theme state
  selectedPieceTheme: string;
  selectedBoardTheme: string;
  crtEffectEnabled: boolean;

  // Window z-index management
  windowStack: string[]; // Window IDs in order, last = top

  // Engine state
  selectedEngine: string | null;
  availableEngines: EngineInfo[];
  engineFetchState: EngineFetchState;
  engineLocked: boolean;

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
  undoLastPlayerMove: () => boolean;
  resetGame: () => void;
  resignGame: () => void;

  // Rewind mode actions
  enterRewindMode: (moveIndex: number) => void;
  exitRewindMode: () => void;

  // UI actions
  setShowMoveHistory: (show: boolean) => void;
  setShowHelp: (show: boolean) => void;
  setShowLanguageWindow: (show: boolean) => void;
  setShowEngineWindow: (show: boolean) => void;
  setShowThemeWindow: (show: boolean) => void;
  closeGameResult: () => void;
  bringWindowToFront: (windowId: string) => void;

  // Theme actions
  setSelectedPieceTheme: (theme: string) => void;
  setSelectedBoardTheme: (theme: string) => void;
  setCrtEffectEnabled: (enabled: boolean) => void;

  // Engine actions
  fetchEngines: () => Promise<void>;
  setSelectedEngine: (engineName: string) => void;
  setEngineLocked: (locked: boolean) => void;

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
  positionEvaluations: {},
  lastMoveAt: null,
  engineContinuationToken: null,
  hasUsedTakeback: false,
  rewindMode: null,
  gameResult: null,
  showMoveHistory: false,
  showHelp: false,
  showLanguageWindow: false,
  showEngineWindow: false,
  showThemeWindow: false,
  moveHistoryFocusRequestId: 0,
  windowStack: [],
  isPlayerTurn: false,
  legalMoves: new Map(),
  chessgroundApi: null,
  currentFen: '',
  selectedEngine: null,
  availableEngines: [],
  engineFetchState: 'idle',
  engineLocked: false,
  selectedPieceTheme: localStorage.getItem('selected-piece-theme') || 'pixel',
  selectedBoardTheme: localStorage.getItem('selected-board-theme') || 'blue',
  crtEffectEnabled: localStorage.getItem('crtEffectEnabled') !== 'false', // Default true

  loadPositionEvaluations: async () => {
    const state = get();
    const { moveHistory, positionEvaluations, playerColor } = state;

    const playerIsWhite = playerColor === 'white';
    const fensToFetch: string[] = [];
    const tokensToSend: string[] = [];

    moveHistory.forEach((move, index) => {
      const fen = move.fen;
      const cached = positionEvaluations[fen];
      if (!cached || cached.status === 'error' || cached.status === 'offline') {
        fensToFetch.push(fen);
        if (move.evaluationToken) {
          tokensToSend.push(move.evaluationToken);
        } else if (index > 0) {
          const previousToken = moveHistory[index - 1].evaluationToken;
          if (previousToken) {
            tokensToSend.push(previousToken);
          }
        }
      }
    });


    if (fensToFetch.length > 0) {
      set(current => {
        const updated = { ...current.positionEvaluations };
        fensToFetch.forEach(fen => {
          updated[fen] = { status: 'loading' };
        });
        return { positionEvaluations: updated };
      });

      try {
        const evaluations = await mcpClient.evaluateFens(
          fensToFetch,
          tokensToSend,
          playerIsWhite
        );

        set(current => {
          const updated = { ...current.positionEvaluations };
          fensToFetch.forEach(fen => {
            const evaluation = evaluations[fen];
            if (evaluation) {
              updated[fen] = { status: 'success', data: evaluation };
            } else {
              updated[fen] = {
                status: 'error',
                error: 'No evaluation returned for position'
              };
            }
          });
          return { positionEvaluations: updated };
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const normalized = message.toLowerCase();
        const connectionIssue = normalized.includes('network') ||
          normalized.includes('connect') ||
          normalized.includes('offline') ||
          normalized.includes('failed to fetch');
        const offline = (typeof navigator !== 'undefined' && !navigator.onLine) || connectionIssue;
        const status: PositionEvaluationStatus = offline ? 'offline' : 'error';

        set(current => {
          const updated = { ...current.positionEvaluations };
          fensToFetch.forEach(fen => {
            updated[fen] = { status, error: message };
          });
          return { positionEvaluations: updated };
        });
      }
    }
  },

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
      // Bring game result window to front
      get().bringWindowToFront('gameResult');
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

    // Check if engine should remain locked due to URL parameter
    // (offline engine lock should be reset, but URL lock should persist)
    const params = new URLSearchParams(window.location.search);
    const shouldLockByUrl = params.get('lockEngine') === 'true';

    set({
      chess,
      playerColor: newColor,
      gameStarted: false,
      moveHistory: [],
      positionEvaluations: {},
      lastMoveAt: null,
      engineContinuationToken: null,
      hasUsedTakeback: false,
      rewindMode: null, // Exit rewind mode on new game
      gameResult: null,
      gameState: 'initializing',
      isPlayerTurn: false,
      legalMoves: new Map(),
      engineLocked: shouldLockByUrl, // Reset offline lock, but preserve URL lock
    });

    // Update turn state after initialization
    setTimeout(() => {
      get().updateTurnState();
    }, 0);
  },

  // Make a player move
  makePlayerMove: (from: string, to: string) => {
    const { chess, gameState, isPlayerTurn, rewindMode } = get();

    // Prevent moves when in rewind mode
    if (rewindMode?.active) {
      console.log('Cannot make moves in rewind mode');
      return false;
    }

    // Validate that it's the player's turn
    if (gameState !== 'player_turn' || !isPlayerTurn) {
      console.log('Not player turn:', { gameState, isPlayerTurn });
      return false;
    }

    try {
      const move = chess.move({ from, to, promotion: 'q' });
      if (move) {
        const timestamp = Date.now();
        const moveRecord: MoveRecord = {
          san: move.san,
          playerKey: 'human',
          fen: chess.fen(), // Store FEN after move
          evaluationToken: null,
          timestamp,
          continuationToken: null
        };
        set(state => ({
          moveHistory: [...state.moveHistory, moveRecord],
          gameStarted: true,
          lastMoveAt: timestamp
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
    const { gameState, rewindMode } = get();

    // Prevent AI moves when in rewind mode
    if (rewindMode?.active) {
      console.log('Cannot make AI moves in rewind mode');
      return;
    }

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
        let evaluationToken: string | null = null;

        // If using offline engine or selectedEngine is the offline engine, use random move
        if (engineToUse === OFFLINE_ENGINE) {
          console.log('[AI] Using offline random engine');
          uciMove = computeRandomMove(currentState.chess);
          // Lock engine selection once offline engine is used
          if (!currentState.engineLocked) {
            console.log('[AI] Locking engine selection - offline engine in use');
            set({ engineLocked: true });
          }
        } else {
          // Call MCP service to get the best move
          try {
            const moveResult = await mcpClient.computeNextMove(fen, engineToUse);
            uciMove = moveResult.move;
            evaluationToken = moveResult.token ?? null;
            console.log('[AI] MCP returned move:', uciMove);
          } catch (mcpError) {
            console.warn('[AI] MCP failed, falling back to offline engine:', mcpError);
            uciMove = computeRandomMove(currentState.chess);
            evaluationToken = null;
            // Lock engine selection when falling back to offline engine
            if (!currentState.engineLocked) {
              console.log('[AI] Locking engine selection - fallback to offline engine');
              set({ engineLocked: true });
            }
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
          const timestamp = Date.now();
          const continuationToken = evaluationToken ?? null;
          const moveRecord: MoveRecord = {
            san: move.san,
            playerKey: engineToUse,
            fen: stateAfterMCP.chess.fen(), // Store FEN after move
            evaluationToken,
            timestamp,
            continuationToken
          };
          set(state => ({
            moveHistory: [...state.moveHistory, moveRecord],
            gameStarted: true,
            lastMoveAt: timestamp,
            engineContinuationToken: continuationToken
          }));
          mcpClient.setToken(continuationToken);

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
              fen: currentState.chess.fen(), // Store FEN after move
              evaluationToken: null,
              timestamp: Date.now(),
              continuationToken: null
            };
            set(state => ({
              moveHistory: [...state.moveHistory, moveRecord],
              gameStarted: true,
              lastMoveAt: moveRecord.timestamp,
              engineContinuationToken: null
            }));
            mcpClient.setToken(null);

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

  undoLastPlayerMove: () => {
    const state = get();
    const { chess, moveHistory, gameState, rewindMode } = state;

    if (moveHistory.length === 0) {
      console.log('[Store] Cannot undo - history is empty');
      return false;
    }

    if (gameState === 'ai_thinking' || gameState === 'game_over') {
      console.log('[Store] Cannot undo - invalid game state:', gameState);
      return false;
    }

    if (rewindMode?.active) {
      console.log('[Store] Cannot undo while in rewind mode');
      return false;
    }

    const lastHumanIndex = (() => {
      for (let i = moveHistory.length - 1; i >= 0; i--) {
        if (moveHistory[i].playerKey === 'human') {
          return i;
        }
      }
      return -1;
    })();

    if (lastHumanIndex === -1) {
      console.log('[Store] Cannot undo - no player moves recorded');
      return false;
    }

    const movesToUndo = moveHistory.length - lastHumanIndex;
    let appliedUndos = 0;

    for (let i = 0; i < movesToUndo; i++) {
      const undone = chess.undo();
      if (!undone) {
        console.warn('[Store] Failed to undo move at step', i);
        break;
      }
      appliedUndos++;
    }

    if (appliedUndos === 0) {
      console.warn('[Store] Undo aborted - no moves were reverted');
      return false;
    }

    const remainingHistory = moveHistory.slice(0, moveHistory.length - appliedUndos);

    const lastRemainingTimestamp = remainingHistory.length > 0
      ? remainingHistory[remainingHistory.length - 1].timestamp
      : null;

    const lastEngineMove = [...remainingHistory].reverse().find(record => record.playerKey !== 'human');
    const continuationToken = lastEngineMove?.continuationToken ?? null;
    mcpClient.setToken(continuationToken ?? null);

    // If we didn't undo all moves we expected, log to help debugging but continue with consistent state.
    if (appliedUndos !== movesToUndo) {
      console.warn('[Store] Expected to undo %d moves but reverted %d', movesToUndo, appliedUndos);
    }

    set({
      moveHistory: remainingHistory,
      rewindMode: null,
      gameResult: null,
      gameStarted: remainingHistory.length > 0,
      lastMoveAt: lastRemainingTimestamp,
      engineContinuationToken: continuationToken ?? null,
      hasUsedTakeback: true,
    });

    get().updateTurnState();
    get().redrawChessground();

    return true;
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
    // Bring game result window to front
    get().bringWindowToFront('gameResult');
  },

  // Rewind mode actions
  enterRewindMode: (moveIndex: number) => {
    const { moveHistory } = get();

    // Validate move index
    if (moveIndex < 0 || moveIndex >= moveHistory.length) {
      console.error('Invalid move index:', moveIndex);
      return;
    }

    const move = moveHistory[moveIndex];
    set({
      rewindMode: {
        active: true,
        moveIndex,
        fen: move.fen
      }
    });
  },

  exitRewindMode: () => {
    set({
      rewindMode: null
    });
  },

  // UI state setters
  setShowMoveHistory: (show: boolean) => {
    set(state => ({
      showMoveHistory: show,
      moveHistoryFocusRequestId: show
        ? state.moveHistoryFocusRequestId + 1
        : state.moveHistoryFocusRequestId
    }));
    if (show) get().bringWindowToFront('moveHistory');
  },
  setShowHelp: (show: boolean) => {
    set({ showHelp: show });
    if (show) get().bringWindowToFront('help');
  },
  setShowLanguageWindow: (show: boolean) => {
    set({ showLanguageWindow: show });
    if (show) get().bringWindowToFront('language');
  },
  setShowEngineWindow: (show: boolean) => {
    set({ showEngineWindow: show });
    if (show) get().bringWindowToFront('engine');
  },
  setShowThemeWindow: (show: boolean) => {
    set({ showThemeWindow: show });
    if (show) get().bringWindowToFront('theme');
  },
  closeGameResult: () => set({ gameResult: null }),

  // Theme actions
  setSelectedPieceTheme: (theme: string) => {
    set({ selectedPieceTheme: theme });
    localStorage.setItem('selected-piece-theme', theme);
  },
  setSelectedBoardTheme: (theme: string) => {
    set({ selectedBoardTheme: theme });
    localStorage.setItem('selected-board-theme', theme);
  },
  setCrtEffectEnabled: (enabled: boolean) => {
    set({ crtEffectEnabled: enabled });
    localStorage.setItem('crtEffectEnabled', enabled ? 'true' : 'false');
  },

  // Window z-index management
  bringWindowToFront: (windowId: string) => {
    const { windowStack } = get();
    // Remove windowId if it exists, then add it to the end (top)
    const newStack = windowStack.filter(id => id !== windowId);
    newStack.push(windowId);
    set({ windowStack: newStack });
  },

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

    // Define offline engine info - only used as fallback
    const offlineEngineInfo: EngineInfo = {
      name: OFFLINE_ENGINE,
      display_name: 'Offline (Random)',
      description: 'A simple offline engine that plays random moves. Fallback when server is unavailable.',
      default: false
    };

    try {
      console.log('[Store] Fetching available engines...');
      const engines = await mcpClient.listEngines();

      // Only use online engines when fetch succeeds
      if (engines.length === 0) {
        throw new Error('No engines returned from server');
      }

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
      } else {
        // Fallback to first engine
        engineToSelect = engines[0].name;
        console.log('[Store] Using first available engine:', engineToSelect);
      }

      // Update state with online engines only
      set({
        availableEngines: engines,
        selectedEngine: engineToSelect,
        engineFetchState: 'success'
      });

      // Persist the selection
      localStorage.setItem('selected-engine', engineToSelect);

      console.log(`[Store] Successfully loaded ${engines.length} online engines`);
    } catch (error) {
      console.error('[Store] Failed to fetch engines:', error);

      // Fall back to offline engine only on failure
      set({
        availableEngines: [offlineEngineInfo],
        selectedEngine: OFFLINE_ENGINE,
        engineFetchState: 'error'
      });
      console.log('[Store] Using offline engine as fallback');
    }
  },

  setSelectedEngine: (engineName: string) => {
    const { engineLocked } = get();
    if (engineLocked) {
      console.log('[Store] Cannot switch engine - engine is locked');
      return;
    }
    console.log('[Store] Switching to engine:', engineName);
    set({ selectedEngine: engineName });
    localStorage.setItem('selected-engine', engineName);
  },

  setEngineLocked: (locked: boolean) => {
    set({ engineLocked: locked });
  },

  getSelectedEngineDisplayName: () => {
    const { selectedEngine, availableEngines } = get();
    const engineInfo = availableEngines.find(e => e.name === selectedEngine);
    return engineInfo?.display_name || 'Untitled Engine';
  },
}));

export default useChessStore;

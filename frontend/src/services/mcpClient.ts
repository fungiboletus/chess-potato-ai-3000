/**
 * MCP Client Service - Manages connection to the chess MCP server
 * Provides a singleton client for computing AI chess moves
 */

import { Client } from '@modelcontextprotocol/sdk/client';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { z } from 'zod';
import {
  type GameFeedbackPayload,
  validateGameFeedbackPayload,
} from './feedbackPayload';

// Connection states
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

// Engine info from MCP server
export interface EngineInfo {
  name: string;
  display_name: string;
  description_i18n?: Record<string, string>;
  description: string;
  default: boolean;
}

export interface NextMoveResult {
  move: string;
  fen: string | null;
  token: string | null;
}

export interface PositionEvaluation {
  expectation: number;
  score: number;
}

export interface FeedbackSubmissionResult {
  submission_id: string;
  stored: boolean;
}

const NextMoveStructuredContentSchema = z.object({
  move: z.string(),
  fen: z.string().nullable().optional(),
  token: z.string().nullable().optional()
});

const ListEnginesStructuredContentSchema = z.object({
  engines: z.array(z.object({
    name: z.string(),
    display_name: z.string(),
    description_i18n: z.record(z.string(), z.string()).optional(),
    description: z.string(),
    default: z.boolean()
  }))
});

const EvaluateFensStructuredContentSchema = z.object({
  evaluations: z.record(z.string(), z.object({
    expectation: z.number(),
    score: z.number()
  }))
});

const FeedbackSubmissionStructuredContentSchema = z.object({
  submission_id: z.string(),
  stored: z.boolean()
});

/**
 * Singleton MCP Client Service for chess engine
 *
 * This class manages a persistent connection to the MCP chess server.
 * Key features:
 * - Singleton pattern ensures single shared connection across the application
 * - Connection promise deduplication prevents race conditions from concurrent connect() calls
 * - Auto-reconnection attempts when computing moves while disconnected
 * - Connection state tracking for UI feedback
 */
class MCPClientService {
  private client: Client | null = null;
  private connectionState: ConnectionState = 'disconnected';
  private connectionError: string | null = null;
  private connectionPromise: Promise<Client> | null = null;
  private currentToken: string | null = null;

  // Configuration
  private readonly SERVER_URL = (() => {
    const configuredServerUrl = import.meta.env.VITE_MCP_SERVER_URL?.trim();
    if (configuredServerUrl) {
      return configuredServerUrl;
    }

    // Smart fallback based on environment
    const isLocalhost = window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1';

    if (isLocalhost) {
      // Development mode: use localhost with explicit port
      return 'http://localhost:8000/mcp';
    } else {
      // Non-local builds should provide the endpoint through Vite env configuration.
      return '/mcp';
    }
  })();
  private readonly CLIENT_NAME = 'chess-potato-ai-3000';
  private readonly CLIENT_VERSION = '1.0.0';

  // Retry configuration
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly RETRY_DELAY_MS = 1000; // Base delay between retries
  private readonly USE_EXPONENTIAL_BACKOFF = true;

  /**
   * Initialize the MCP server connection.
   * Uses promise deduplication so concurrent callers share a single connection attempt.
   */
  async connect(): Promise<void> {
    await this.ensureClient();
  }

  /**
   * Ensure we have a connected client.
   * If a connection is being established, reuse the in-flight promise.
   */
  private async ensureClient(): Promise<Client> {
    if (this.client && this.connectionState === 'connected') {
      return this.client;
    }

    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = (async () => {
      try {
        return await this.establishConnection();
      } finally {
        this.connectionPromise = null;
      }
    })();

    return this.connectionPromise;
  }

  /**
   * Establish a brand new connection to the MCP server.
   */
  private async establishConnection(): Promise<Client> {
    this.connectionState = 'connecting';
    this.connectionError = null;

    const transport = new StreamableHTTPClientTransport(new URL(this.SERVER_URL));
    const client = new Client({
      name: this.CLIENT_NAME,
      version: this.CLIENT_VERSION
    });

    try {
      await client.connect(transport);
      this.client = client;
      this.connectionState = 'connected';
      console.log('[MCP] Connected to server at', this.SERVER_URL);
      return client;
    } catch (error) {
      const message = this.getErrorMessage(error);
      console.error('[MCP] Connection attempt failed:', error);
      this.resetClientState();
      this.connectionState = 'error';
      this.connectionError = `Unable to connect: ${message}`;
      throw new Error(`Failed to connect to MCP server: ${message}`);
    }
  }

  private resetClientState(): void {
    this.client = null;
    this.currentToken = null;
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) {
      return error.message;
    }

    if (typeof error === 'string') {
      return error;
    }

    try {
      return JSON.stringify(error);
    } catch {
      return 'Unknown error';
    }
  }

  private isConnectionIssue(message: string): boolean {
    const normalized = message.toLowerCase();
    return normalized.includes('not connected') ||
      normalized.includes('econnrefused') ||
      normalized.includes('failed to fetch') ||
      normalized.includes('network') ||
      normalized.includes('connection') ||
      normalized.includes('timeout');
  }

  private handleConnectionDrop(context: string, error: unknown): void {
    const message = this.getErrorMessage(error);
    console.warn(`[MCP] Connection lost during ${context}: ${message}`);

    if (this.client) {
      this.client.close().catch(closeError => {
        console.debug('[MCP] Error closing client after connection loss:', closeError);
      });
    }

    if (this.currentToken) {
      console.log('[MCP] Dropping continuation token after connection loss');
    }

    this.resetClientState();
    this.connectionState = 'disconnected';
    this.connectionError = 'Connection lost. Retrying...';
    this.connectionPromise = null;
  }

  /**
   * Retry an operation with configurable attempts and exponential backoff
   * @param operation - The async operation to retry
   * @param operationName - Name of the operation for logging purposes
   * @returns The result of the operation
   * @throws The last error if all retry attempts fail
   */
  private async retryOperation<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.MAX_RETRY_ATTEMPTS; attempt++) {
      try {
        if (attempt > 1) {
          console.log(`[MCP] Retry attempt ${attempt}/${this.MAX_RETRY_ATTEMPTS} for ${operationName}`);
        }

        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // If this is the last attempt, throw the error
        if (attempt === this.MAX_RETRY_ATTEMPTS) {
          console.error(`[MCP] All ${this.MAX_RETRY_ATTEMPTS} retry attempts failed for ${operationName}`);
          throw lastError;
        }

        // Calculate delay with optional exponential backoff
        const delay = this.USE_EXPONENTIAL_BACKOFF
          ? this.RETRY_DELAY_MS * Math.pow(2, attempt - 1)
          : this.RETRY_DELAY_MS;

        console.warn(
          `[MCP] ${operationName} failed (attempt ${attempt}/${this.MAX_RETRY_ATTEMPTS}):`,
          lastError.message,
          `- retrying in ${delay}ms...`
        );

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // This should never be reached due to the throw in the loop, but TypeScript needs it
    throw lastError || new Error('Retry operation failed');
  }

  /**
   * Disconnect from the MCP server
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.close();
      } catch (error) {
        console.error('[MCP] Error disconnecting:', error);
      }
    }
    this.resetClientState();
    this.connectionState = 'disconnected';
    this.connectionError = null;
    this.connectionPromise = null;
  }

  /**
   * Compute the next best move for a given chess position
   * Automatically retries up to 3 times on failure with exponential backoff
   * @param fen - The chess position in FEN notation
   * @param engineName - The engine to use for computation
   * @returns The best move in UCI format (e.g., "e2e4")
   * @throws Error if not connected or move computation fails after all retries
   */
  async computeNextMove(fen: string, engineName: string): Promise<NextMoveResult> {
    return this.retryOperation(async () => {
      if (this.connectionState !== 'connected') {
        console.log('[MCP] Establishing connection before computing move...');
      }

      const client = await this.ensureClient();

      try {
        console.log('[MCP] Computing move for position:', fen);
        if (this.currentToken) {
          console.log('[MCP] Using continuation token from previous move');
        }

        // Call the MCP tool with optional token from previous move
        const result = await client.callTool({
          name: 'compute_next_move',
          arguments: {
            fen: fen,
            engine_name: engineName,
            ...(this.currentToken && { token: this.currentToken })
          }
        });

        const rawContent = result.structuredContent;

        if (!rawContent) {
          throw new Error('Empty response from MCP server');
        }

        const content = NextMoveStructuredContentSchema.parse(rawContent);

        // Extract the UCI move from the response
        const uciMove = content.move;
        const resultingFen = content.fen ?? null;
        const token = content.token ?? null;

        if (!uciMove || uciMove.length < 4) {
          throw new Error('Invalid UCI move format received');
        }

        // Store the token for the next move
        if (token) {
          this.currentToken = token;
          console.log('[MCP] Stored continuation token for next move');
        }

        console.log('[MCP] Received move:', uciMove);
        return {
          move: uciMove,
          fen: resultingFen,
          token
        };

      } catch (error) {
        const errorMsg = this.getErrorMessage(error);
        console.error('[MCP] Error computing move:', error);

        if (this.isConnectionIssue(errorMsg)) {
          this.handleConnectionDrop('compute_next_move', error);
        }

        throw new Error(`Failed to compute move: ${errorMsg}`);
      }
    }, 'compute_next_move');
  }

  /**
   * Get the current connection state
   */
  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  /**
   * Evaluate a batch of positions and return their scores.
   * @param fens - Unique board positions in FEN notation.
   * @param tokens - Security tokens tied to each FEN from computer move responses.
   * @param playerIsWhite - When provided, orient scores from the human player's perspective.
   */
  async evaluateFens(
    fens: string[],
    tokens: string[],
    playerIsWhite?: boolean
  ): Promise<Record<string, PositionEvaluation>> {
    if (fens.length === 0) {
      return {};
    }

    return this.retryOperation(async () => {
      if (this.connectionState !== 'connected') {
        console.log('[MCP] Establishing connection before evaluating positions...');
      }

      const client = await this.ensureClient();

      // Ensure token list matches requested FENs

      try {
        console.log(`[MCP] Evaluating ${fens.length} position(s)...`);
        const result = await client.callTool({
          name: 'evaluate_fens',
          arguments: {
            fens,
            tokens,
            ...(typeof playerIsWhite === 'boolean' ? { player_is_white: playerIsWhite } : {})
          }
        });

        const rawContent = result.structuredContent;

        if (!rawContent) {
          throw new Error('Empty response from MCP server');
        }

        const content = EvaluateFensStructuredContentSchema.parse(rawContent);

        console.log('[MCP] Received evaluations for', Object.keys(content.evaluations).length, 'position(s)');
        return content.evaluations;
      } catch (error) {
        const errorMsg = this.getErrorMessage(error);
        console.error('[MCP] Error evaluating positions:', error);

        if (this.isConnectionIssue(errorMsg)) {
          this.handleConnectionDrop('evaluate_fens', error);
        }

        throw new Error(`Failed to evaluate positions: ${errorMsg}`);
      }
    }, 'evaluate_fens');
  }

  /**
   * Get the last connection error (if any)
   */
  getConnectionError(): string | null {
    return this.connectionError;
  }

  /**
   * Check if the client is connected
   */
  isConnected(): boolean {
    return this.connectionState === 'connected';
  }

  /**
   * Reset the continuation token (call this when starting a new game)
   * This prevents tokens from an old game being used in a new game
   */
  resetToken(): void {
    if (this.currentToken) {
      console.log('[MCP] Clearing continuation token for new game');
    }
    this.currentToken = null;
  }

  /**
   * Explicitly set the continuation token (used when rewinding gameplay state)
   */
  setToken(token: string | null): void {
    if (token) {
      console.log('[MCP] Restoring continuation token from history');
    } else if (this.currentToken) {
      console.log('[MCP] Clearing continuation token');
    }
    this.currentToken = token;
  }

  /**
   * List all available chess engines from the MCP server
   * @returns Array of engine information
   * @throws Error if not connected or listing fails
   */
  async listEngines(): Promise<EngineInfo[]> {
    if (this.connectionState !== 'connected') {
      console.log('[MCP] Establishing connection before listing engines...');
    }

    const client = await this.ensureClient();

    try {
      console.log('[MCP] Fetching available engines...');

      const result = await client.callTool({
        name: 'list_engines',
        arguments: {}
      });

      const rawContent = result.structuredContent;

      if (!rawContent) {
        throw new Error('Empty response from MCP server');
      }

      const content = ListEnginesStructuredContentSchema.parse(rawContent);

      console.log(`[MCP] Found ${content.engines.length} engines`);
      return content.engines;

    } catch (error) {
      const errorMsg = this.getErrorMessage(error);
      console.error('[MCP] Error listing engines:', error);

      if (this.isConnectionIssue(errorMsg)) {
        this.handleConnectionDrop('list_engines', error);
      }

      throw new Error(`Failed to list engines: ${errorMsg}`);
    }
  }

  async submitGameFeedback(payload: GameFeedbackPayload): Promise<FeedbackSubmissionResult> {
    return this.retryOperation(async () => {
      if (this.connectionState !== 'connected') {
        console.log('[MCP] Establishing connection before submitting feedback...');
      }

      const client = await this.ensureClient();
      const validatedPayload = validateGameFeedbackPayload(payload);

      try {
        console.log('[MCP] Submitting post-game feedback...');

        const result = await client.callTool({
          name: 'submit_game_feedback',
          arguments: {
            feedback: validatedPayload
          }
        });

        const rawContent = result.structuredContent;

        if (!rawContent) {
          throw new Error('Empty response from MCP server');
        }

        const content = FeedbackSubmissionStructuredContentSchema.parse(rawContent);

        return content;
      } catch (error) {
        const errorMsg = this.getErrorMessage(error);
        console.error('[MCP] Error submitting feedback:', error);

        if (this.isConnectionIssue(errorMsg)) {
          this.handleConnectionDrop('submit_game_feedback', error);
        }

        throw new Error('Feedback submission failed');
      }
    }, 'submit_game_feedback');
  }
}

/**
 * Singleton instance - use this exported instance throughout the application
 * to ensure a single shared connection to the MCP server
 */
export const mcpClient = new MCPClientService();

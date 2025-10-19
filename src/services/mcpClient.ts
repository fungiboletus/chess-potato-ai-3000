/**
 * MCP Client Service - Manages connection to the chess MCP server
 * Provides a singleton client for computing AI chess moves
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { CallToolResultSchema } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

// Connection states
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

const NextMoveResultSchema = CallToolResultSchema.extend({
  structuredContent: z.object({
    move: z.string(),
    fen: z.string(),
    token: z.string()
  }).passthrough().optional()
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
  private transport: StreamableHTTPClientTransport | null = null;
  private connectionState: ConnectionState = 'disconnected';
  private connectionError: string | null = null;
  private connectionPromise: Promise<void> | null = null;
  private currentToken: string | null = null;

  // Configuration
  private readonly SERVER_URL = (() => {
    // Use environment variable if provided at build time
    if (import.meta.env.VITE_MCP_SERVER_URL) {
      return import.meta.env.VITE_MCP_SERVER_URL;
    }

    // Smart fallback based on environment
    const isLocalhost = window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1';

    if (isLocalhost) {
      // Development mode: use localhost with explicit port
      return 'http://localhost:8000/mcp';
    } else {
      // Production mode: use relative path (assumes same origin)
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
   * Initialize and connect to the MCP server
   * Implements connection promise deduplication to prevent race conditions
   */
  async connect(): Promise<void> {
    // If already connecting, return the existing promise to prevent duplicate connections
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    // If already connected, return immediately
    if (this.connectionState === 'connected' && this.client) {
      return Promise.resolve();
    }

    // Create and execute connection promise
    this.connectionPromise = (async () => {
      try {
        this.connectionState = 'connecting';
        this.connectionError = null;

        // Create transport
        this.transport = new StreamableHTTPClientTransport(
          new URL(this.SERVER_URL)
        );

        // Create client
        this.client = new Client({
          name: this.CLIENT_NAME,
          version: this.CLIENT_VERSION
        });

        // Connect to server
        await this.client.connect(this.transport);

        this.connectionState = 'connected';
        console.log('[MCP] Connected to server at', this.SERVER_URL);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        this.connectionState = 'error';
        this.connectionError = errorMsg;

        this.handleConnectionError(error);
        throw new Error(`Failed to connect to MCP server: ${errorMsg}`);
      } finally {
        this.connectionPromise = null;
      }
    })();

    return this.connectionPromise;
  }

  /**
   * Handle connection errors with helpful logging
   */
  private handleConnectionError(error: unknown): void {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    const isConnectionRefused = errorMsg.includes('Not connected') ||
      errorMsg.includes('ECONNREFUSED') ||
      errorMsg.includes('Failed to fetch') ||
      errorMsg.includes('connection') ||
      errorMsg.includes('network');

    if (isConnectionRefused) {
      console.warn('[MCP] Could not connect to server at', this.SERVER_URL, '- is the server running?');
    } else {
      console.error('[MCP] Connection failed:', error);
    }
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
    this.client = null;
    this.transport = null;
    this.connectionState = 'disconnected';
    this.connectionError = null;
    this.connectionPromise = null;
  }

  /**
   * Compute the next best move for a given chess position
   * Automatically retries up to 3 times on failure with exponential backoff
   * @param fen - The chess position in FEN notation
   * @returns The best move in UCI format (e.g., "e2e4")
   * @throws Error if not connected or move computation fails after all retries
   */
  async computeNextMove(fen: string): Promise<string> {
    return this.retryOperation(async () => {
      // Ensure we're connected
      if (this.connectionState !== 'connected' || !this.client) {
        console.log('[MCP] Not connected, attempting to connect...');
        await this.connect();
      }

      if (!this.client) {
        throw new Error('MCP client not initialized');
      }

      try {
        console.log('[MCP] Computing move for position:', fen);
        if (this.currentToken) {
          console.log('[MCP] Using continuation token from previous move');
        }

        // Call the MCP tool with optional token from previous move
        const result = await this.client.callTool({
          name: 'compute_next_move',
          arguments: {
            fen: fen,
            //engine: 'worstfish',
            engine_name: 'alphabet',
            ...(this.currentToken && { token: this.currentToken })
          }
        }, NextMoveResultSchema);

        const content = result.structuredContent as typeof NextMoveResultSchema['_output']['structuredContent'];

        // Extract the UCI move from the response
        if (!content) {
          throw new Error('Empty response from MCP server');
        }

        const uciMove = content.move;

        if (!uciMove || uciMove.length < 4) {
          throw new Error('Invalid UCI move format received');
        }

        // Store the token for the next move
        if (content.token) {
          this.currentToken = content.token;
          console.log('[MCP] Stored continuation token for next move');
        }

        console.log('[MCP] Received move:', uciMove);
        return uciMove;

      } catch (error) {
        console.error('[MCP] Error computing move:', error);

        // Check if this is a connection error and update state
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        const isConnectionError = errorMsg.includes('Not connected') ||
          errorMsg.includes('ECONNREFUSED') ||
          errorMsg.includes('Failed to fetch') ||
          errorMsg.includes('connection') ||
          errorMsg.includes('network');

        if (isConnectionError) {
          this.connectionState = 'error';
          this.connectionError = 'Connection lost';
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
}

/**
 * Singleton instance - use this exported instance throughout the application
 * to ensure a single shared connection to the MCP server
 */
export const mcpClient = new MCPClientService();

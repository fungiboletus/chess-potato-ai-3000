/**
 * Offline Random Chess Engine
 *
 * A simple fallback engine that plays random legal moves.
 * Used when MCP server is unavailable or engine fetching fails.
 */

import type { Chess } from 'chess.js';

/**
 * Compute a random legal move for the given chess position
 * @param chess - The chess.js instance with the current position
 * @returns UCI move string (e.g., "e2e4")
 */
export function computeRandomMove(chess: Chess): string {
  const moves = chess.moves({ verbose: true });

  if (moves.length === 0) {
    throw new Error('No legal moves available');
  }

  const randomMove = moves[Math.floor(Math.random() * moves.length)];
  return randomMove.from + randomMove.to + (randomMove.promotion || '');
}

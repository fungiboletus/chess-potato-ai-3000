import { z } from 'zod';

export const MAX_FEEDBACK_PAYLOAD_BYTES = 262144;
export const MAX_FEEDBACK_HISTORY_LENGTH = 512;
export const MAX_FEEDBACK_NOTES_LENGTH = 4000;
export const MAX_RESULT_MESSAGE_LENGTH = 1024;
export const MAX_GENERIC_TEXT_LENGTH = 128;
export const MAX_DISPLAY_NAME_LENGTH = 256;
export const MAX_FEN_LENGTH = 128;
export const MAX_SAN_LENGTH = 32;
export const MAX_PLAYER_KEY_LENGTH = 64;

const BOARD_SQUARE_PATTERN = /^[a-h][1-8]$/;
const textEncoder = new TextEncoder();

export interface FeedbackMoveRecord {
  san: string;
  playerKey: string;
  engineName: string | null;
  engineDisplayName: string | null;
  fen: string;
  evaluationToken: string | null;
  continuationToken: string | null;
  timestamp: number;
  from: string;
  to: string;
}

export interface GameFeedbackPayload {
  feedback: {
    enjoyment: string | null;
    authenticity: string | null;
    notes: string;
  };
  game: {
    result: {
      type: 'win' | 'lose' | 'draw' | string | null;
      reason: string | null;
      message: string | null;
    };
    playerColor: 'white' | 'black' | string | null;
    selectedEngine: string | null;
    selectedEngineDisplayName: string | null;
    engineWasOffline: boolean;
    usedTakeback: boolean;
    finalFen: string | null;
  };
  metadata: {
    source: 'web';
    clientName: string;
    clientVersion: string;
    locale: string | null;
  };
  history: FeedbackMoveRecord[];
}

const FeedbackMoveRecordSchema = z.object({
  san: z.string().min(1).max(MAX_SAN_LENGTH),
  playerKey: z.string().min(1).max(MAX_PLAYER_KEY_LENGTH),
  engineName: z.string().max(MAX_GENERIC_TEXT_LENGTH).nullable(),
  engineDisplayName: z.string().max(MAX_DISPLAY_NAME_LENGTH).nullable(),
  fen: z.string().min(1).max(MAX_FEN_LENGTH),
  evaluationToken: z.string().max(1024).nullable(),
  continuationToken: z.string().max(1024).nullable(),
  timestamp: z.number().int().nonnegative(),
  from: z.string().regex(BOARD_SQUARE_PATTERN),
  to: z.string().regex(BOARD_SQUARE_PATTERN),
});

const GameFeedbackPayloadSchema = z.object({
  feedback: z.object({
    enjoyment: z.enum(['loved_it', 'it_was_okay', 'not_really']).nullable(),
    authenticity: z.enum(['very_human', 'somewhat_human', 'not_human']).nullable(),
    notes: z.string().max(MAX_FEEDBACK_NOTES_LENGTH),
  }),
  game: z.object({
    result: z.object({
      type: z.enum(['win', 'lose', 'draw']).nullable(),
      reason: z.string().max(MAX_GENERIC_TEXT_LENGTH).nullable(),
      message: z.string().max(MAX_RESULT_MESSAGE_LENGTH).nullable(),
    }),
    playerColor: z.enum(['white', 'black']).nullable(),
    selectedEngine: z.string().max(MAX_GENERIC_TEXT_LENGTH).nullable(),
    selectedEngineDisplayName: z.string().max(MAX_DISPLAY_NAME_LENGTH).nullable(),
    engineWasOffline: z.boolean(),
    usedTakeback: z.boolean(),
    finalFen: z.string().min(1).max(MAX_FEN_LENGTH),
  }),
  metadata: z.object({
    source: z.literal('web'),
    clientName: z.string().min(1).max(MAX_GENERIC_TEXT_LENGTH),
    clientVersion: z.string().min(1).max(MAX_GENERIC_TEXT_LENGTH),
    locale: z.string().max(16).nullable(),
  }),
  history: z.array(FeedbackMoveRecordSchema).min(1).max(MAX_FEEDBACK_HISTORY_LENGTH),
});

function getPayloadByteLength(payload: GameFeedbackPayload): number {
  return textEncoder.encode(JSON.stringify(payload)).length;
}

export function prepareGameFeedbackPayload(payload: GameFeedbackPayload): GameFeedbackPayload {
  return {
    ...payload,
    history: payload.history.map(move => {
      const continuationToken =
        move.continuationToken && move.continuationToken !== move.evaluationToken
          ? move.continuationToken
          : null;

      return {
        ...move,
        continuationToken,
      };
    }),
  };
}

export function validateGameFeedbackPayload(payload: GameFeedbackPayload): GameFeedbackPayload {
  const normalizedPayload = prepareGameFeedbackPayload(payload);
  const parsedPayload = GameFeedbackPayloadSchema.parse(normalizedPayload);

  if (getPayloadByteLength(parsedPayload) > MAX_FEEDBACK_PAYLOAD_BYTES) {
    throw new Error('Feedback payload exceeds the maximum size');
  }

  return parsedPayload;
}
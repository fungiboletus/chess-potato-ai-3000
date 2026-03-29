import type { TFunction } from 'i18next';
import type { GameResult } from '../stores/chessStore';

export function getGameResultMessage(
  t: TFunction,
  gameResult: Pick<GameResult, 'type' | 'reason'> | null | undefined,
): string {
  if (!gameResult) {
    return '';
  }

  switch (gameResult.reason) {
    case 'checkmate':
      return gameResult.type === 'win'
        ? t('result.messages.checkmate_win')
        : t('result.messages.checkmate_lose');
    case 'stalemate':
      return t('result.messages.stalemate');
    case 'threefold_repetition':
      return t('result.messages.threefold_repetition');
    case 'insufficient_material':
      return t('result.messages.insufficient_material');
    case 'fifty_move_rule':
      return t('result.messages.fifty_move_rule');
    case 'resignation':
      return t('result.messages.resignation');
    default:
      return gameResult.type === 'draw' ? t('result.messages.draw') : '';
  }
}

export function getGameStatusText(
  t: TFunction,
  gameResult: Pick<GameResult, 'type' | 'reason'> | null | undefined,
): string {
  if (!gameResult) {
    return t('status.draw');
  }

  if (gameResult.reason === 'resignation') {
    return t('status.you_resigned');
  }

  if (gameResult.reason === 'checkmate') {
    return gameResult.type === 'win'
      ? t('status.checkmate_you_win')
      : t('status.checkmate_ai_wins');
  }

  return t('status.draw');
}
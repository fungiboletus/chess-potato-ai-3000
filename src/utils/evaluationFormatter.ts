import type { PositionEvaluationState } from '../stores/chessStore';
import type { TFunction } from 'i18next';

/**
 * Formats an evaluation score and expectation into a human-readable string.
 * @param evaluation - The evaluation data containing score and expectation
 * @returns A formatted string representation of the evaluation
 */
export const formatEvaluation = (evaluation: { score: number; expectation: number } | undefined): string => {
  if (!evaluation) {
    return '-';
  }

  const { score, expectation } = evaluation;

  if (!Number.isFinite(score)) {
    return '-';
  }

  if (Math.abs(score) >= 9800) {
    const mateDistance = Math.max(0, 10000 - Math.abs(score));
    const mateMoves = Math.ceil(mateDistance / 2);
    const prefix = score > 0 ? '#' : '-#';
    return mateMoves > 0 ? `${prefix}${mateMoves}` : prefix;
  }

  const pawnScore = score / 100;
  const roundedScore = Math.round(pawnScore * 100) / 100;
  const formattedScore = roundedScore === 0
    ? '0.00'
    : roundedScore > 0
      ? `+${roundedScore.toFixed(2)}`
      : roundedScore.toFixed(2);

  const expectationPercent = Math.round(Math.min(Math.max(expectation * 100, 0), 100));
  //return `${formattedScore} (${expectationPercent}%)`;
  return `${expectationPercent}% (${formattedScore})`;
};

/**
 * Gets display attributes for a position evaluation.
 * @param fen - The FEN string of the position
 * @param positionEvaluations - Map of FEN strings to evaluation states
 * @param t - Translation function
 * @returns An object with display text and optional title for tooltips
 */
export const getEvaluationAttributes = (
  fen: string,
  positionEvaluations: Record<string, PositionEvaluationState>,
  t: TFunction
): { display: string; title?: string } => {
  const evaluationState: PositionEvaluationState | undefined = positionEvaluations[fen];

  if (!evaluationState) {
    return { display: '-' };
  }

  if (evaluationState.status === 'loading') {
    return { display: '-' };
  }

  if (evaluationState.status === 'success') {
    return { display: formatEvaluation(evaluationState.data) };
  }

  if (evaluationState.status === 'offline') {
    return {
      display: 'N/A',
      title: evaluationState.error || t('move_history.eval_offline_hint', { defaultValue: 'Evaluation unavailable while offline.' })
    };
  }

  if (evaluationState.status === 'error') {
    return {
      display: 'Error',
      title: evaluationState.error || t('move_history.eval_error_hint', { defaultValue: 'Unable to evaluate position.' })
    };
  }

  return { display: '-' };
};

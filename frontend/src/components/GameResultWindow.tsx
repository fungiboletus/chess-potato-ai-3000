import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { DraggableWindow } from './DraggableWindow';
import { EvalChart } from './EvalChart';
import { mcpClient } from '../services/mcpClient';
import {
  MAX_FEEDBACK_NOTES_LENGTH,
  type GameFeedbackPayload,
} from '../services/feedbackPayload';
import useChessStore, { OFFLINE_ENGINE, selectIsOfflineMode, type GameResult } from '../stores/chessStore';
import { getGameResultMessage } from '../utils/gameResultI18n';
import { getEngineDisplayNameByName } from '../utils/engineI18n';

const RESULT_WINDOW_WIDTH = 440;
const RESULT_WINDOW_HEIGHT = 470;

interface GameResultWindowProps {
  isOpen: boolean;
  onClose: () => void;
  gameResult: GameResult | null;
  windowId?: string;
  zIndex?: number;
}

export const GameResultWindow: React.FC<GameResultWindowProps> = ({
  isOpen,
  onClose,
  gameResult,
  windowId,
  zIndex,
}) => {
  const { t } = useTranslation();
  const message = useMemo(() => getGameResultMessage(t, gameResult), [gameResult, t]);

  const config = useMemo(() => {
    switch (gameResult?.type) {
      case 'win':
        return {
          title: t('game.victory'),
          headline: t('result.victory_headline'),
        };
      case 'lose':
        return {
          title: t('game.defeat'),
          headline: t('result.defeat_headline'),
        };
      case 'draw':
        return {
          title: t('game.draw'),
          headline: t('result.draw_headline'),
        };
      default:
        return {
          title: t('game.draw'),
          headline: t('result.draw_headline'),
        };
    }
  }, [gameResult?.type, t]);

  const getCenterPosition = () => {
    if (typeof window === 'undefined') {
      return { x: 0, y: 0 };
    }
    return {
      x: Math.max(0, (window.innerWidth - RESULT_WINDOW_WIDTH) / 2),
      y: Math.max(0, (window.innerHeight - RESULT_WINDOW_HEIGHT) / 2)
    };
  };

  const isOfflineMode = useChessStore(selectIsOfflineMode);

  return (
    <DraggableWindow
      title={config.title}
      isOpen={isOpen}
      onClose={onClose}
      defaultPosition={getCenterPosition()}
      className="game-result-window"
      windowId={windowId}
      zIndex={zIndex}
    >
      <GameResultContent
        gameResult={gameResult}
        headline={config.headline}
        message={message}
        onClose={onClose}
        isOfflineMode={isOfflineMode}
      />
    </DraggableWindow>
  );
};

interface GameResultContentProps {
  gameResult: GameResult | null;
  headline: string;
  message: string;
  onClose: () => void;
  isOfflineMode: boolean;
}

type EnjoymentValue = 'loved_it' | 'it_was_okay' | 'not_really';
type AuthenticityValue = 'very_human' | 'somewhat_human' | 'not_human';

const GameResultContent: React.FC<GameResultContentProps> = ({
  gameResult,
  headline,
  message,
  onClose,
  isOfflineMode,
}) => {
  const { t, i18n } = useTranslation();
  const contentRef = useRef<HTMLDivElement>(null);
  const [enjoyment, setEnjoyment] = useState<EnjoymentValue | null>(null);
  const [authenticity, setAuthenticity] = useState<AuthenticityValue | null>(null);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [hasSubmitError, setHasSubmitError] = useState(false);
  const moveHistory = useChessStore(state => state.moveHistory);
  const playerColor = useChessStore(state => state.playerColor);
  const selectedEngine = useChessStore(state => state.selectedEngine);
  const availableEngines = useChessStore(state => state.availableEngines);
  const hasUsedTakeback = useChessStore(state => state.hasUsedTakeback);
  const chess = useChessStore(state => state.chess);

  useLayoutEffect(() => {
    const scrollContainer = contentRef.current?.closest('.window-body');
    if (scrollContainer instanceof HTMLElement) {
      scrollContainer.scrollTop = 0;
    }
  }, [headline, message, isOfflineMode]);

  const selectedEngineDisplayName = getEngineDisplayNameByName(selectedEngine, availableEngines);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting || isSubmitted) {
      return;
    }

    const payload: GameFeedbackPayload = {
      feedback: {
        enjoyment,
        authenticity,
        notes,
      },
      game: {
        result: {
          type: gameResult?.type ?? null,
          reason: gameResult?.reason ?? null,
          message,
        },
        playerColor,
        selectedEngine,
        selectedEngineDisplayName,
        engineWasOffline: isOfflineMode || selectedEngine === OFFLINE_ENGINE,
        usedTakeback: hasUsedTakeback,
        finalFen: chess.fen(),
      },
      metadata: {
        source: 'web',
        clientName: 'chess-potato-ai-3000',
        clientVersion: '1.0.0',
        locale: i18n.resolvedLanguage ?? i18n.language ?? null,
      },
      history: moveHistory.map(move => ({
        san: move.san,
        playerKey: move.playerKey,
        engineName: move.engineName ?? null,
        engineDisplayName: getEngineDisplayNameByName(
          move.engineName ?? move.playerKey,
          availableEngines,
          move.engineDisplayName
        ) ?? null,
        fen: move.fen,
        evaluationToken: move.evaluationToken ?? null,
        continuationToken: move.continuationToken ?? null,
        timestamp: move.timestamp,
        from: move.from,
        to: move.to,
      })),
    };

    setHasSubmitError(false);
    setIsSubmitting(true);

    try {
      await mcpClient.submitGameFeedback(payload);
      setIsSubmitting(false);
      setIsSubmitted(true);
    } catch {
      setIsSubmitting(false);
      setHasSubmitError(true);
    }
  };

  const disabled = isSubmitting || isSubmitted;

  const enjoymentOptions = useMemo(
    () => [
      { value: 'loved_it' as EnjoymentValue, label: t('feedback.enjoyment.loved_it') },
      { value: 'it_was_okay' as EnjoymentValue, label: t('feedback.enjoyment.it_was_okay') },
      { value: 'not_really' as EnjoymentValue, label: t('feedback.enjoyment.not_really') },
    ],
    [t]
  );

  const authenticityOptions = useMemo(
    () => [
      { value: 'very_human' as AuthenticityValue, label: t('feedback.authenticity.very_human') },
      { value: 'somewhat_human' as AuthenticityValue, label: t('feedback.authenticity.somewhat_human') },
      { value: 'not_human' as AuthenticityValue, label: t('feedback.authenticity.not_human') },
    ],
    [t]
  );

  return (
    <div className="game-result-content" ref={contentRef}>
      <div className="game-result-headline">
        {headline}
      </div>

      <div className="game-result-message">
        {message}
      </div>

      {!isOfflineMode && (
        <>
          <form className="game-feedback-form" onSubmit={handleSubmit}>
            <div className="game-feedback-grid">
              <fieldset disabled={disabled}>
                <legend>{t('feedback.enjoyment.legend')}</legend>
                {enjoymentOptions.map(option => (
                  <div className="field-row" key={option.value}>
                    <input
                      id={`game-enjoyment-${option.value}`}
                      type="radio"
                      name="game-enjoyment"
                      value={option.value}
                      checked={enjoyment === option.value}
                      onChange={() => setEnjoyment(option.value)}
                    />
                    <label htmlFor={`game-enjoyment-${option.value}`}>
                      {option.label}
                    </label>
                  </div>
                ))}
              </fieldset>

              <fieldset disabled={disabled}>
                <legend>{t('feedback.authenticity.legend')}</legend>
                {authenticityOptions.map(option => (
                  <div className="field-row" key={option.value}>
                    <input
                      id={`game-authenticity-${option.value}`}
                      type="radio"
                      name="game-authenticity"
                      value={option.value}
                      checked={authenticity === option.value}
                      onChange={() => setAuthenticity(option.value)}
                    />
                    <label htmlFor={`game-authenticity-${option.value}`}>
                      {option.label}
                    </label>
                  </div>
                ))}
              </fieldset>
            </div>

            <div className="field-row-stacked game-feedback-notes">
              <label htmlFor="game-feedback-notes">
                {t('feedback.notes_label')}
              </label>
              <textarea
                id="game-feedback-notes"
                rows={3}
                value={notes}
                onChange={event => setNotes(event.target.value)}
                maxLength={MAX_FEEDBACK_NOTES_LENGTH}
                disabled={disabled}
              />
            </div>

            <div className="game-feedback-submit">
              {hasSubmitError && (
                <div className="game-feedback-status game-feedback-error" role="alert">
                  {t('feedback.submit_error')}
                </div>
              )}
              <button
                type="submit"
                className={`game-feedback-submit-button${isSubmitted ? ' game-feedback-submit-button-submitted' : ''}`}
                disabled={disabled}
              >
                {isSubmitted
                  ? t('feedback.thank_you')
                  : isSubmitting
                    ? t('feedback.submitting')
                    : t('feedback.submit')}
              </button>
            </div>
          </form>

          <div className="game-result-chart">
            <EvalChart />
          </div>
        </>
      )}

      <button
        onClick={onClose}
        className="game-result-close"
        type="button"
      >
        {t('game.close')}
      </button>
    </div>
  );
};

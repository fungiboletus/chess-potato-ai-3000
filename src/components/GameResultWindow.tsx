import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { DraggableWindow } from './DraggableWindow';
import { EvalChart } from './EvalChart';

interface GameResultWindowProps {
  isOpen: boolean;
  onClose: () => void;
  result: 'win' | 'lose' | 'draw';
  message: string;
  windowId?: string;
  zIndex?: number;
}

export const GameResultWindow: React.FC<GameResultWindowProps> = ({
  isOpen,
  onClose,
  result,
  message,
  windowId,
  zIndex,
}) => {
  const { t } = useTranslation();

  const config = useMemo(() => {
    switch (result) {
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
  }, [result, t]);

  const getCenterPosition = useCallback(() => {
    if (typeof window === 'undefined') {
      return { x: 0, y: 0 };
    }
    const windowWidth = 380;
    const windowHeight = 430;
    return {
      x: Math.max(0, (window.innerWidth - windowWidth) / 2),
      y: Math.max(0, (window.innerHeight - windowHeight) / 2)
    };
  }, []);

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
        headline={config.headline}
        message={message}
        onClose={onClose}
      />
    </DraggableWindow>
  );
};

interface GameResultContentProps {
  headline: string;
  message: string;
  onClose: () => void;
}

type EnjoymentValue = 'loved_it' | 'it_was_okay' | 'not_really';
type AuthenticityValue = 'very_human' | 'somewhat_human' | 'not_human';

const SUBMIT_TIMEOUT_MS = 900;

const GameResultContent: React.FC<GameResultContentProps> = ({
  headline,
  message,
  onClose,
}) => {
  const { t } = useTranslation();
  const [enjoyment, setEnjoyment] = useState<EnjoymentValue | null>(null);
  const [authenticity, setAuthenticity] = useState<AuthenticityValue | null>(null);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const submitTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (submitTimeoutRef.current !== null) {
        window.clearTimeout(submitTimeoutRef.current);
      }
    };
  }, []);

  const handleSubmit = useCallback((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting || isSubmitted) {
      return;
    }
    setIsSubmitting(true);
    submitTimeoutRef.current = window.setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
    }, SUBMIT_TIMEOUT_MS);
  }, [isSubmitting, isSubmitted]);

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
    <div className="game-result-content">
      <div className="game-result-headline">
        {headline}
      </div>

      <div className="game-result-message">
        {message}
      </div>

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
            rows={5}
            value={notes}
            onChange={event => setNotes(event.target.value)}
            disabled={disabled}
          />
        </div>

        <div className="game-feedback-submit">
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

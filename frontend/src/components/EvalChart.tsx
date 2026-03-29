import React, { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import useChessStore, { selectIsOfflineMode } from '../stores/chessStore';

const CANVAS_WIDTH = 320;
const CANVAS_HEIGHT = 112;
const CHART_PADDING = 4;
const CHART_WIDTH = CANVAS_WIDTH - CHART_PADDING * 2;
const CHART_HEIGHT = CANVAS_HEIGHT - CHART_PADDING * 2;
const MATE_SCORE_CENTIPAWNS = 10000;
const MATE_SCORE_BUFFER = 32;
const EXTREME_LIMIT_PAWNS = (MATE_SCORE_CENTIPAWNS - MATE_SCORE_BUFFER) / 100;
const EXTREME_SEGMENT_FRACTION = 0.05;
const DUAL_SCALE_LABEL_GRANULARITY = 10; // Round offset axis labels to neat 10 cp steps

interface EvalPoint {
  expectation: number | null;
  score: number | null;
}

interface PixelColor {
  r: number;
  g: number;
  b: number;
  a?: number;
}

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

const formatCentipawnLabel = (value: number, granularity = 1): string => {
  const effectiveGranularity = Math.max(1, Math.floor(granularity));
  const rawCentipawns = value * 100;
  let cpValue: number;

  if (effectiveGranularity === 1) {
    cpValue = Math.round(rawCentipawns);
  } else {
    const roundedMagnitude =
      Math.round(Math.abs(rawCentipawns) / effectiveGranularity) * effectiveGranularity;
    const signedRounded = Math.sign(rawCentipawns) * roundedMagnitude;
    cpValue =
      signedRounded === 0 && rawCentipawns !== 0
        ? Math.sign(rawCentipawns) * effectiveGranularity
        : signedRounded;
  }

  if (cpValue === 0) {
    return '0';
  }
  const sign = cpValue > 0 ? '+' : '';
  return `${sign}${cpValue}`;
};

export const EvalChart: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { t } = useTranslation();
  const moveHistory = useChessStore(state => state.moveHistory);
  const positionEvaluations = useChessStore(state => state.positionEvaluations);
  const loadPositionEvaluations = useChessStore(state => state.loadPositionEvaluations);
  const isOfflineMode = useChessStore(selectIsOfflineMode);

  useEffect(() => {
    if (isOfflineMode || moveHistory.length === 0) {
      return;
    }

    const missingEvaluations = moveHistory.some(move => !positionEvaluations[move.fen]);
    if (missingEvaluations) {
      void loadPositionEvaluations();
    }
  }, [isOfflineMode, loadPositionEvaluations, moveHistory, positionEvaluations]);

  useEffect(() => {
    if (typeof window === 'undefined' || isOfflineMode) {
      return;
    }

    const handleOnline = () => {
      if (moveHistory.length === 0) {
        return;
      }

      const shouldReload = moveHistory.some(move => {
        const evaluationState = positionEvaluations[move.fen];
        return evaluationState?.status === 'offline' || evaluationState?.status === 'error';
      });

      if (shouldReload) {
        void loadPositionEvaluations();
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [isOfflineMode, loadPositionEvaluations, moveHistory, positionEvaluations]);

  const {
    points,
    minScore,
    maxScore,
    trimmedMinScore,
    trimmedMaxScore,
    lowerExtremeMinScore,
    lowerExtremeMaxScore,
    upperExtremeMinScore,
    upperExtremeMaxScore,
    hasAnyData
  } = useMemo(() => {
    const mapped: EvalPoint[] = moveHistory.map(move => {
      const evaluationState = positionEvaluations[move.fen];
      if (evaluationState?.status === 'success' && evaluationState.data) {
        const { expectation, score } = evaluationState.data;
        if (Number.isFinite(expectation) && Number.isFinite(score)) {
          return {
            expectation: clamp(expectation, 0, 1),
            score: score / 100
          };
        }
      }

      return { expectation: null, score: null };
    });

    let globalMin = Infinity;
    let globalMax = -Infinity;
    let trimmedMin = Infinity;
    let trimmedMax = -Infinity;
    let lowerExtremeMin = Infinity;
    let lowerExtremeMax = -Infinity;
    let upperExtremeMin = Infinity;
    let upperExtremeMax = -Infinity;

    mapped.forEach(point => {
      if (point.score === null) {
        return;
      }
      globalMin = Math.min(globalMin, point.score);
      globalMax = Math.max(globalMax, point.score);
      if (Math.abs(point.score) <= EXTREME_LIMIT_PAWNS) {
        trimmedMin = Math.min(trimmedMin, point.score);
        trimmedMax = Math.max(trimmedMax, point.score);
      }
      if (point.score <= -EXTREME_LIMIT_PAWNS) {
        lowerExtremeMin = Math.min(lowerExtremeMin, point.score);
        lowerExtremeMax = Math.max(lowerExtremeMax, point.score);
      }
      if (point.score >= EXTREME_LIMIT_PAWNS) {
        upperExtremeMin = Math.min(upperExtremeMin, point.score);
        upperExtremeMax = Math.max(upperExtremeMax, point.score);
      }
    });

    if (globalMin === Infinity || globalMax === -Infinity) {
      globalMin = 0;
      globalMax = 0;
    }

    if (trimmedMin === Infinity || trimmedMax === -Infinity || trimmedMin > trimmedMax) {
      trimmedMin = globalMin;
      trimmedMax = globalMax;
    }

    if (lowerExtremeMin === Infinity || lowerExtremeMax === -Infinity) {
      lowerExtremeMin = globalMin;
      lowerExtremeMax = globalMin;
    }

    if (upperExtremeMin === Infinity || upperExtremeMax === -Infinity) {
      upperExtremeMin = globalMax;
      upperExtremeMax = globalMax;
    }

    const anyData = mapped.some(point => point.expectation !== null && point.score !== null);

    return {
      points: mapped,
      minScore: globalMin,
      maxScore: globalMax,
      trimmedMinScore: trimmedMin,
      trimmedMaxScore: trimmedMax,
      lowerExtremeMinScore: lowerExtremeMin,
      lowerExtremeMaxScore: lowerExtremeMax,
      upperExtremeMinScore: upperExtremeMin,
      upperExtremeMaxScore: upperExtremeMax,
      hasAnyData: anyData
    };
  }, [moveHistory, positionEvaluations]);

  const isLoading = useMemo(
    () => moveHistory.some(move => positionEvaluations[move.fen]?.status === 'loading'),
    [moveHistory, positionEvaluations]
  );

  const safeScaleMagnitude = Math.max(Math.abs(trimmedMinScore), Math.abs(trimmedMaxScore));
  const roundedScaleCentipawns =
    Math.ceil((safeScaleMagnitude * 100) / DUAL_SCALE_LABEL_GRANULARITY) * DUAL_SCALE_LABEL_GRANULARITY;
  const chartScale = Math.max(1, roundedScaleCentipawns / 100);
  const turnCount = Math.max(1, Math.ceil(moveHistory.length / 2));
  const hasMoves = moveHistory.length > 0;

  const rightAxisTicks = useMemo(() => {
    // The right axis blends two scales: a central "safe" region that stays symmetric, and
    // small offset zones that indicate there are positions beyond the visible range.
    // If we only see extreme scores on one side (e.g. we're getting mated), we still keep
    // the opposite label anchored to the safe range instead of inflating it with the mate value.
    const safeMin = trimmedMinScore;
    const safeMax = trimmedMaxScore;
    const hasLowerExtremes = minScore < safeMin - Number.EPSILON;
    const hasUpperExtremes = maxScore > safeMax + Number.EPSILON;

    const topValue = hasUpperExtremes ? safeMax : chartScale;
    const bottomValue = hasLowerExtremes ? safeMin : -chartScale;

    const topOffset: 'down' | null = hasUpperExtremes ? 'down' : null;
    const bottomOffset: 'up' | null = hasLowerExtremes ? 'up' : null;
    const labelGranularity = DUAL_SCALE_LABEL_GRANULARITY;

    return [
      {
        id: 'top' as const,
        label: formatCentipawnLabel(topValue, labelGranularity),
        offset: topOffset
      },
      {
        id: 'middle' as const,
        label: formatCentipawnLabel(0, labelGranularity),
        offset: null
      },
      {
        id: 'bottom' as const,
        label: formatCentipawnLabel(bottomValue, labelGranularity),
        offset: bottomOffset
      }
    ];
  }, [chartScale, maxScore, minScore, trimmedMaxScore, trimmedMinScore]);

  const turnLabelData = useMemo(() => {
    const total = turnCount;
    if (total <= 0) {
      return [{ value: 1, position: 0 }];
    }

    const candidates = [
      1,
      Math.max(1, Math.min(total, Math.round(total * 0.25))),
      Math.max(1, Math.min(total, Math.round(total * 0.5))),
      total
    ];

    const uniqueSorted = Array.from(new Set(candidates)).sort((a, b) => a - b);

    return uniqueSorted.map(value => {
      const denominator = Math.max(total - 1, 1);
      const position = total === 1 ? 0 : (value - 1) / denominator;
      return { value, position: clamp(position, 0, 1) };
    });
  }, [turnCount]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }

    const width = CANVAS_WIDTH;
    const height = CANVAS_HEIGHT;
    const chartLeft = CHART_PADDING;
    const chartTop = CHART_PADDING;
    const chartWidth = CHART_WIDTH;
    const chartHeight = CHART_HEIGHT;
    const chartRight = chartLeft + chartWidth - 1;
    const chartBottom = chartTop + chartHeight - 1;
    const pointCount = points.length;
    const chartPixelWidth = Math.max(chartWidth - 1, 0);
    const chartPixelHeight = Math.max(chartHeight - 1, 0);
    const xStep = pointCount > 1 ? chartPixelWidth / (pointCount - 1) : 0;

    context.save();
    context.imageSmoothingEnabled = false;
    canvas.style.imageRendering = 'pixelated';
    context.clearRect(0, 0, width, height);

    const imageData = context.createImageData(width, height);
    const { data } = imageData;

    const fillChartBackground = () => {
      for (let y = chartTop; y <= chartBottom; y += 1) {
        for (let x = chartLeft; x <= chartRight; x += 1) {
          const index = (y * width + x) * 4;
          data[index] = 255;
          data[index + 1] = 255;
          data[index + 2] = 255;
          data[index + 3] = 255;
        }
      }
    };

    const setPixel = (x: number, y: number, { r, g, b, a = 255 }: PixelColor) => {
      if (x < chartLeft || x > chartRight || y < chartTop || y > chartBottom) {
        return;
      }
      const index = (y * width + x) * 4;
      data[index] = r;
      data[index + 1] = g;
      data[index + 2] = b;
      data[index + 3] = a;
    };

    const drawLine = (x0: number, y0: number, x1: number, y1: number, color: PixelColor) => {
      let currentX = x0;
      let currentY = y0;
      const deltaX = Math.abs(x1 - x0);
      const deltaY = Math.abs(y1 - y0);
      const stepX = x0 < x1 ? 1 : -1;
      const stepY = y0 < y1 ? 1 : -1;
      let error = deltaX - deltaY;

      // Bresenham line algorithm
      while (true) {
        setPixel(currentX, currentY, color);
        if (currentX === x1 && currentY === y1) {
          break;
        }
        const error2 = error * 2;
        if (error2 > -deltaY) {
          error -= deltaY;
          currentX += stepX;
        }
        if (error2 < deltaX) {
          error += deltaX;
          currentY += stepY;
        }
      }
    };

    const drawHorizontalLine = (y: number, color: PixelColor) => {
      if (y < chartTop || y > chartBottom) {
        return;
      }
      drawLine(chartLeft, y, chartRight, y, color);
    };

    const drawVerticalLine = (x: number, color: PixelColor) => {
      if (x < chartLeft || x > chartRight) {
        return;
      }
      drawLine(x, chartTop, x, chartBottom, color);
    };

    const GRID_PRIMARY_COLOR: PixelColor = { r: 192, g: 192, b: 192, a: 255 };
    const GRID_SECONDARY_COLOR: PixelColor = { r: 232, g: 232, b: 232, a: 255 };
    const EXPECTATION_COLOR: PixelColor = { r: 0, g: 100, b: 0, a: 255 };
    const CENTIPAWN_SERIES_COLOR: PixelColor = { r: 139, g: 0, b: 0, a: 255 };

    fillChartBackground();

    // Draw horizontal grid lines (top, middle, bottom)
    drawHorizontalLine(chartTop, GRID_PRIMARY_COLOR);
    drawHorizontalLine(chartTop + Math.round(chartPixelHeight / 2), GRID_PRIMARY_COLOR);
    drawHorizontalLine(chartBottom, GRID_PRIMARY_COLOR);

    // Draw vertical lines for each turn
    for (let turn = 0; turn <= turnCount; turn += 1) {
      const fraction = turnCount === 0 ? 0 : turn / turnCount;
      const x = chartLeft + Math.round(chartPixelWidth * fraction);
      drawVerticalLine(x, GRID_SECONDARY_COLOR);
    }

    const drawSeries = (
      getNormalizedValue: (point: EvalPoint) => number | null,
      color: PixelColor
    ) => {
      let previousPoint: { x: number; y: number } | null = null;

      for (let index = 0; index < pointCount; index += 1) {
        const normalized = getNormalizedValue(points[index]);
        if (normalized === null) {
          previousPoint = null;
          continue;
        }

        const x = Math.max(
          chartLeft,
          Math.min(chartRight, chartLeft + Math.round(xStep * index))
        );
        const rawY = chartTop + (1 - normalized) * chartPixelHeight;
        const y = Math.max(chartTop, Math.min(chartBottom, Math.round(rawY)));

        if (previousPoint) {
          drawLine(previousPoint.x, previousPoint.y, x, y, color);
        } else {
          setPixel(x, y, color);
        }

        previousPoint = { x, y };
      }
    };

    drawSeries(point => {
      if (point.expectation === null) {
        return null;
      }
      return point.expectation;
    }, EXPECTATION_COLOR);

    drawSeries(point => {
      if (point.score === null) {
        return null;
      }

      if (minScore === maxScore) {
        return 0.5;
      }

      const lowerBand = EXTREME_SEGMENT_FRACTION;
      const upperBandStart = 1 - EXTREME_SEGMENT_FRACTION;

      const safeMin = trimmedMinScore;
      const safeMax = trimmedMaxScore;
      const globalMin = minScore;
      const globalMax = maxScore;
      const lowerExtremeMinValue = lowerExtremeMinScore;
      const lowerExtremeMaxValue = lowerExtremeMaxScore;
      const upperExtremeMinValue = upperExtremeMinScore;
      const upperExtremeMaxValue = upperExtremeMaxScore;
      const hasLowerExtremes = lowerExtremeMaxValue < safeMin;
      const hasUpperExtremes = upperExtremeMinValue > safeMax;
      const score = clamp(point.score, globalMin, globalMax);

      if (hasLowerExtremes && score < safeMin) {
        const clampedScore = clamp(score, lowerExtremeMinValue, lowerExtremeMaxValue);
        const denominator = lowerExtremeMaxValue - lowerExtremeMinValue;
        if (denominator === 0) {
          return lowerBand;
        }
        const ratio = (clampedScore - lowerExtremeMinValue) / denominator;
        return clamp(ratio * lowerBand, 0, lowerBand);
      }

      if (hasUpperExtremes && score > safeMax) {
        const clampedScore = clamp(score, upperExtremeMinValue, upperExtremeMaxValue);
        const denominator = upperExtremeMaxValue - upperExtremeMinValue;
        if (denominator === 0) {
          return upperBandStart;
        }
        const ratio = (clampedScore - upperExtremeMinValue) / denominator;
        return clamp(upperBandStart + ratio * lowerBand, upperBandStart, 1);
      }

      const coreRange = safeMax - safeMin;
      if (coreRange === 0) {
        return lowerBand + (upperBandStart - lowerBand) / 2;
      }

      const ratio = (score - safeMin) / coreRange;
      return clamp(lowerBand + ratio * (upperBandStart - lowerBand), 0, 1);
    }, CENTIPAWN_SERIES_COLOR);

    context.putImageData(imageData, 0, 0);

    context.restore();
  }, [
    chartScale,
    lowerExtremeMaxScore,
    lowerExtremeMinScore,
    maxScore,
    minScore,
    points,
    trimmedMaxScore,
    trimmedMinScore,
    turnCount,
    upperExtremeMaxScore,
    upperExtremeMinScore
  ]);

  return (
    <div
      className="eval-chart"
      style={{
        '--eval-chart-width': `${CANVAS_WIDTH}px`,
        '--eval-chart-height': `${CANVAS_HEIGHT}px`
      } as React.CSSProperties}
    >
      <div className="eval-chart__header">
        <span className="eval-chart__axis-title eval-chart__axis-title--win">
          {t('eval_chart.win_probability')}
        </span>
        <span aria-hidden className="eval-chart__header-spacer" />
        <span className="eval-chart__axis-title eval-chart__axis-title--centipawn">
          {t('eval_chart.centipawns')}
        </span>
      </div>
      <div className="eval-chart__row">
        <div className="eval-chart__axis-container eval-chart__axis-container--left">
          <div className="eval-chart__axis eval-chart__axis--left">
            <span>100%</span>
            <span>50%</span>
            <span>0%</span>
          </div>
        </div>
        <div className="eval-chart__canvas-cell">
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="eval-chart__canvas"
            aria-hidden
          />
        </div>
        <div className="eval-chart__axis-container eval-chart__axis-container--right">
          <div className="eval-chart__axis eval-chart__axis--right">
            {rightAxisTicks.map(tick => {
              const classes = ['eval-chart__axis-value'];
              if (tick.offset === 'down') {
                classes.push('eval-chart__axis-value--top-offset');
              }
              if (tick.offset === 'up') {
                classes.push('eval-chart__axis-value--bottom-offset');
              }
              return (
                <span key={tick.id} className={classes.join(' ')}>
                  {tick.label}
                </span>
              );
            })}
          </div>
        </div>
      </div>
      <div className="eval-chart__bottom-axis">
        <div
          className="eval-chart__turn-labels"
          style={{
            width: `${CHART_WIDTH}px`,
            marginLeft: `${CHART_PADDING}px`,
            marginRight: `${CHART_PADDING}px`
          }}
        >
          {turnLabelData.map(({ value, position }) => {
            const alignment = position === 0 ? 'start' : position === 1 ? 'end' : 'center';
            return (
              <span
                key={value}
                className={`eval-chart__turn-label eval-chart__turn-label--${alignment}`}
                style={{ left: `${position * 100}%` }}
              >
                {value.toString()}
              </span>
            );
          })}
        </div>
        <span className="eval-chart__axis-title eval-chart__axis-title--bottom">
          {t('eval_chart.turns')}
        </span>
      </div>

      {!hasAnyData && (
        <div className="eval-chart__empty">
          {hasMoves
            ? isLoading
              ? t('eval_chart.loading')
              : isOfflineMode
                ? t('eval_chart.offline_unavailable')
                : t('eval_chart.unavailable')
            : t('eval_chart.no_moves')}
        </div>
      )}
    </div>
  );
};

export default EvalChart;

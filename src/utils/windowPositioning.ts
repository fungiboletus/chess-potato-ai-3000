/**
 * Utility functions for responsive window positioning
 */

export interface WindowDimensions {
  width: number;
  height: number;
}

export interface Position {
  x: number;
  y: number;
}

/**
 * Get current viewport dimensions
 */
export const getViewportDimensions = (): WindowDimensions => ({
  width: window.innerWidth,
  height: window.innerHeight,
});

/**
 * Calculate responsive position based on viewport size and desired placement
 */
export const getResponsivePosition = (
  windowSize: WindowDimensions,
  placement: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'left-center' | 'right-center',
  offset: Position = { x: 0, y: 0 }
): Position => {
  const viewport = getViewportDimensions();
  const margin = 20; // Minimum margin from viewport edges

  // Ensure window size doesn't exceed viewport
  const effectiveWidth = Math.min(windowSize.width, viewport.width - 2 * margin);
  const effectiveHeight = Math.min(windowSize.height, viewport.height - 2 * margin);

  let x: number;
  let y: number;

  switch (placement) {
    case 'center':
      x = (viewport.width - effectiveWidth) / 2;
      y = (viewport.height - effectiveHeight) / 2;
      break;
    case 'top-left':
      x = margin;
      y = margin;
      break;
    case 'top-right':
      x = viewport.width - effectiveWidth - margin;
      y = margin;
      break;
    case 'bottom-left':
      x = margin;
      y = viewport.height - effectiveHeight - margin;
      break;
    case 'bottom-right':
      x = viewport.width - effectiveWidth - margin;
      y = viewport.height - effectiveHeight - margin;
      break;
    case 'left-center':
      x = margin;
      y = (viewport.height - effectiveHeight) / 2;
      break;
    case 'right-center':
      x = viewport.width - effectiveWidth - margin;
      y = (viewport.height - effectiveHeight) / 2;
      break;
    default:
      x = margin;
      y = margin;
  }

  // Apply offset
  x += offset.x;
  y += offset.y;

  // Ensure the window stays within viewport bounds
  x = Math.max(margin, Math.min(x, viewport.width - effectiveWidth - margin));
  y = Math.max(margin, Math.min(y, viewport.height - effectiveHeight - margin));

  return { x, y };
};

/**
 * Calculate staggered positions for multiple windows
 */
export const getStaggeredPosition = (
  windowSize: WindowDimensions,
  basePosition: Position,
  index: number,
  staggerOffset: Position = { x: 30, y: 30 }
): Position => {
  const viewport = getViewportDimensions();
  const margin = 20;

  let x = basePosition.x + (index * staggerOffset.x);
  let y = basePosition.y + (index * staggerOffset.y);

  // If staggered position goes outside viewport, wrap around
  if (x + windowSize.width > viewport.width - margin) {
    x = margin + ((x - margin) % (viewport.width - windowSize.width - 2 * margin));
  }
  if (y + windowSize.height > viewport.height - margin) {
    y = margin + ((y - margin) % (viewport.height - windowSize.height - 2 * margin));
  }

  return { x, y };
};

/**
 * Reset all window positions to their responsive defaults
 * Useful for debugging or when positions get stuck outside viewport
 */
export const resetAllWindowPositions = () => {
  const windowIds = ['move-history', 'help'];
  const gameResultIds = ['game-result-win', 'game-result-lose', 'game-result-draw'];

  [...windowIds, ...gameResultIds].forEach(id => {
    localStorage.removeItem(`${id}-position`);
  });
};

/**
 * Check if a position is within the current viewport bounds
 */
export const isPositionInViewport = (
  position: Position,
  windowSize: WindowDimensions,
  margin: number = 20
): boolean => {
  const viewport = getViewportDimensions();

  return (
    position.x >= margin &&
    position.y >= margin &&
    position.x + windowSize.width <= viewport.width - margin &&
    position.y + windowSize.height <= viewport.height - margin
  );
};

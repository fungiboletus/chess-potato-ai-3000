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
  const margin = 10; // Reduced margin for more flexible positioning

  // Ensure window size doesn't exceed viewport, but allow some flexibility
  const effectiveWidth = Math.min(windowSize.width, viewport.width - margin);
  const effectiveHeight = Math.min(windowSize.height, viewport.height - margin);

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

  // More lenient bounds checking - allow windows to go partially off-screen
  const minVisibleArea = 50;
  x = Math.max(-effectiveWidth + minVisibleArea, Math.min(x, viewport.width - minVisibleArea));
  y = Math.max(-20, Math.min(y, viewport.height - minVisibleArea)); // Keep title bar accessible

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
  const minVisibleArea = 50;

  let x = basePosition.x + (index * staggerOffset.x);
  let y = basePosition.y + (index * staggerOffset.y);

  // If staggered position goes outside viewport, wrap around more gracefully
  if (x + windowSize.width > viewport.width - minVisibleArea) {
    x = minVisibleArea + ((x - minVisibleArea) % (viewport.width - windowSize.width - minVisibleArea));
  }
  if (y + windowSize.height > viewport.height - minVisibleArea) {
    y = minVisibleArea + ((y - minVisibleArea) % (viewport.height - windowSize.height - minVisibleArea));
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

import React, { type ReactNode, useLayoutEffect, useRef, useState } from 'react';
import Draggable from 'react-draggable';
import useChessStore from '../stores/chessStore';

interface DraggableWindowProps {
  title: string;
  children: ReactNode;
  statusBar?: ReactNode;
  onClose?: () => void;
  onMouseDown?: () => void;
  isOpen: boolean;
  defaultPosition?: { x: number; y: number };
  className?: string;
  onDragStop?: () => void;
  windowId?: string; // Unique ID for z-index management
  zIndex?: number; // Z-index to apply
}

// Helper function to calculate smart default positions
const getSmartPosition = (defaultPos: { x: number; y: number } | undefined) => {
  if (!defaultPos) {
    return { x: 20, y: 20 };
  }

  // Ensure position is within viewport bounds
  const viewport = { width: window.innerWidth, height: window.innerHeight };
  const constrainedX = Math.max(0, Math.min(defaultPos.x, viewport.width - 300));
  const constrainedY = Math.max(0, Math.min(defaultPos.y, viewport.height - 200));

  return { x: constrainedX, y: constrainedY };
};

export const DraggableWindow: React.FC<DraggableWindowProps> = ({
  title,
  children,
  statusBar,
  onClose,
  onMouseDown,
  isOpen,
  defaultPosition = { x: 0, y: 0 },
  className = '',
  onDragStop,
  windowId,
  zIndex,
}) => {
  const nodeRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(() => getSmartPosition(defaultPosition));
  const bringWindowToFront = useChessStore(state => state.bringWindowToFront);

  // Handle mouse down to bring window to front
  const handleMouseDown = () => {
    if (windowId) {
      bringWindowToFront(windowId);
    }
    if (onMouseDown) {
      onMouseDown();
    }
  };

  useLayoutEffect(() => {
    // check that it's visible when it's opened
    if (isOpen && nodeRef.current) {
      const rect = nodeRef.current.getBoundingClientRect();
      const viewport = { width: window.innerWidth, height: window.innerHeight };
      const minVisibleArea = 50;

      // Check if window is positioned outside viewport bounds
      const isOutsideViewport =
        rect.right < minVisibleArea || // too far left
        rect.left > viewport.width - minVisibleArea || // too far right
        rect.bottom < minVisibleArea || // too far up
        rect.top > viewport.height - minVisibleArea; // too far down

      if (isOutsideViewport) {
        // Reset position to ensure it's visible - using useLayoutEffect to measure/update synchronously before paint
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPosition(getSmartPosition(defaultPosition));
      }
    }
  }, [isOpen, defaultPosition]);

  if (!isOpen) return null;

  const handleDrag = (_e: unknown, data: { x: number; y: number }) => {
    // Keep window title bar accessible - prevent it from being dragged completely off-screen
    //const viewport = { width: window.innerWidth, height: window.innerHeight };
    //const minVisibleArea = 50;

    //const constrainedX = Math.max(-200, Math.min(data.x, viewport.width - minVisibleArea));
    //const constrainedY = Math.max(0, Math.min(data.y, viewport.height - minVisibleArea));

    const { x, y } = data;
    setPosition({ x, y });
  };

  const handleStop = (/*_e: unknown, _data: unknown*/) => {
    if (onDragStop) {
      onDragStop();
    }
  };

  return (
    <Draggable
      position={position}
      onDrag={handleDrag}
      onStop={handleStop}
      handle=".title-bar"
      cancel=".title-bar-controls"
      nodeRef={nodeRef}
      bounds="parent"
    >
      <div
        ref={nodeRef}
        className={`window ${className}`}
        onMouseDownCapture={handleMouseDown}
        style={{ zIndex }}
      >
        <div className="title-bar draggable-title-bar">
          <div className="title-bar-text">{title}</div>
          <div className="title-bar-controls draggable-title-bar-controls">
            {onClose && (
              <button
                aria-label="Close"
                onClick={onClose}
                className="draggable-close-button"
              ></button>
            )}
          </div>
        </div>
        <div className="window-body draggable-window-body">
          {children}
        </div>
        {statusBar && (
          <div className="status-bar draggable-status-bar">
            {statusBar}
          </div>
        )}
      </div>
    </Draggable>
  );
};

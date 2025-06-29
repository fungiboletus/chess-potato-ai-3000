import React, { type ReactNode, useRef, useState } from 'react';
import Draggable from 'react-draggable';

interface DraggableWindowProps {
  title: string;
  children: ReactNode;
  onClose?: () => void;
  isOpen: boolean;
  defaultPosition?: { x: number; y: number };
  className?: string;
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
  onClose,
  isOpen,
  defaultPosition = { x: 20, y: 20 },
  className = '',
}) => {
  const nodeRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(() => getSmartPosition(defaultPosition));

  if (!isOpen) return null;

  const handleDrag = (_e: any, data: any) => {
    // Keep window title bar accessible - prevent it from being dragged completely off-screen
    const viewport = { width: window.innerWidth, height: window.innerHeight };
    const minVisibleArea = 50;

    const constrainedX = Math.max(-200, Math.min(data.x, viewport.width - minVisibleArea));
    const constrainedY = Math.max(0, Math.min(data.y, viewport.height - minVisibleArea));

    setPosition({ x: constrainedX, y: constrainedY });
  };

  return (
    <Draggable
      position={position}
      onDrag={handleDrag}
      handle=".title-bar"
      cancel=".title-bar-controls"
      enableUserSelectHack={false}
      nodeRef={nodeRef}
    >
      <div ref={nodeRef} className={`window ${className}`} style={{ position: 'absolute', zIndex: 1000 }}>
        <div className="title-bar draggable-title-bar">
          <div className="title-bar-text">{title}</div>
          <div className="title-bar-controls draggable-title-bar-controls">
            {onClose && (
              <button
                aria-label="Close"
                onClick={onClose}
                className="draggable-close-button"
              >
                ✕
              </button>
            )}
          </div>
        </div>
        <div className="window-body draggable-window-body">
          {children}
        </div>
      </div>
    </Draggable>
  );
};

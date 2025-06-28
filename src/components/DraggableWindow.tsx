import React, { type ReactNode, useRef, useMemo, useEffect } from 'react';
import Draggable from 'react-draggable';
import useLocalStorageState from 'use-local-storage-state';
import { getResponsivePosition } from '../utils/windowPositioning';

interface DraggableWindowProps {
  title: string;
  children: ReactNode;
  onClose?: () => void;
  isOpen: boolean;
  windowId: string;
  defaultPosition?: { x: number; y: number };
  responsivePosition?: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'left-center' | 'right-center';
  positionOffset?: { x: number; y: number };
  width?: number;
  height?: number;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  resizable?: boolean;
  className?: string;
}

export const DraggableWindow: React.FC<DraggableWindowProps> = ({
  title,
  children,
  onClose,
  isOpen,
  windowId,
  defaultPosition,
  responsivePosition,
  positionOffset = { x: 0, y: 0 },
  width = 300,
  height = 400,
  minWidth = 200,
  minHeight = 150,
  maxWidth,
  maxHeight,
  className = '',
}) => {
  const nodeRef = useRef<HTMLDivElement>(null);

  // Calculate responsive default position if specified
  const calculatedDefaultPosition = useMemo(() => {
    if (responsivePosition) {
      return getResponsivePosition(
        { width, height },
        responsivePosition,
        positionOffset
      );
    }
    return defaultPosition || { x: 20, y: 20 };
  }, [responsivePosition, positionOffset, width, height, defaultPosition]);

  const [position, setPosition] = useLocalStorageState(`${windowId}-position`, {
    defaultValue: calculatedDefaultPosition,
  });

  const [size] = useLocalStorageState(`${windowId}-size`, {
    defaultValue: { width, height },
  });

  // Handle window resize to keep windows in viewport
  useEffect(() => {
    if (!responsivePosition) return;

    const handleResize = () => {
      const newPosition = getResponsivePosition(
        { width: size.width, height: size.height },
        responsivePosition,
        positionOffset
      );

      // Only update if position would be significantly different (avoid constant updates)
      const threshold = 50;
      if (Math.abs(position.x - newPosition.x) > threshold ||
        Math.abs(position.y - newPosition.y) > threshold) {
        setPosition(newPosition);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [responsivePosition, positionOffset, size, position, setPosition]);

  if (!isOpen) return null;

  const handleDrag = (_e: any, data: any) => {
    // Allow more freedom in dragging - only prevent windows from going completely off-screen
    const viewport = { width: window.innerWidth, height: window.innerHeight };
    const minVisibleArea = 50; // Minimum pixels that must remain visible

    // Allow window to be dragged mostly off-screen but keep some visible for retrieval
    const constrainedX = Math.max(-size.width + minVisibleArea, Math.min(data.x, viewport.width - minVisibleArea));
    const constrainedY = Math.max(-20, Math.min(data.y, viewport.height - minVisibleArea)); // Keep title bar accessible

    setPosition({ x: constrainedX, y: constrainedY });
  };

  const windowStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: size.width,
    minWidth,
    maxWidth,
    height: size.height,
    minHeight,
    maxHeight,
    zIndex: 1000,
    userSelect: 'none',
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
      <div ref={nodeRef} className={`window ${className}`} style={windowStyle}>
        <div className="title-bar" style={{ cursor: 'move', touchAction: 'none' }}>
          <div className="title-bar-text">{title}</div>
          <div className="title-bar-controls" style={{ touchAction: 'auto' }}>
            {onClose && (
              <button
                aria-label="Close"
                onClick={onClose}
                style={{
                  background: '#c0c0c0',
                  border: '1px outset #c0c0c0',
                  width: '16px',
                  height: '14px',
                  fontSize: '11px',
                  padding: 0,
                  margin: 0,
                  cursor: 'pointer',
                  touchAction: 'manipulation',
                }}
              >
                ✕
              </button>
            )}
          </div>
        </div>
        <div className="window-body" style={{ height: 'calc(100% - 18px)', overflow: 'auto' }}>
          {children}
        </div>
      </div>
    </Draggable>
  );
};

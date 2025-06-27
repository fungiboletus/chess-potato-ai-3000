import React, { type ReactNode, useRef } from 'react';
import Draggable from 'react-draggable';
import useLocalStorageState from 'use-local-storage-state';

interface DraggableWindowProps {
  title: string;
  children: ReactNode;
  onClose?: () => void;
  isOpen: boolean;
  windowId: string;
  defaultPosition?: { x: number; y: number };
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
  defaultPosition = { x: 20, y: 20 },
  width = 300,
  height = 400,
  minWidth = 200,
  minHeight = 150,
  maxWidth,
  maxHeight,
  className = '',
}) => {
  const nodeRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useLocalStorageState(`${windowId}-position`, {
    defaultValue: defaultPosition,
  });

  const [size] = useLocalStorageState(`${windowId}-size`, {
    defaultValue: { width, height },
  });

  if (!isOpen) return null;

  const handleDrag = (_e: any, data: any) => {
    setPosition({ x: data.x, y: data.y });
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
      bounds="body"
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

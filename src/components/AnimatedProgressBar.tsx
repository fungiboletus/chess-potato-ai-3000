import { useState, useEffect } from 'react';

interface AnimatedProgressBarProps {
  isVisible: boolean;
  width?: number;
  height?: number;
}

export const AnimatedProgressBar: React.FC<AnimatedProgressBarProps> = ({
  isVisible,
  width = 200,
  height = 20,
}) => {
  const [progress, setProgress] = useState(0);
  const [direction, setDirection] = useState(1);

  useEffect(() => {
    if (!isVisible) {
      setProgress(0);
      setDirection(1);
      return;
    }

    const interval = setInterval(() => {
      setProgress((prev) => {
        let newProgress = prev + direction * 2; // Slower movement for more authentic feel

        if (newProgress >= 100) {
          newProgress = 100;
          setDirection(-1);
        } else if (newProgress <= 0) {
          newProgress = 0;
          setDirection(1);
        }

        return newProgress;
      });
    }, 80); // Slower timing for more authentic Windows 98 feel

    return () => clearInterval(interval);
  }, [isVisible, direction]);

  const containerStyle: React.CSSProperties = {
    width: `${width}px`,
    height: `${height}px`,
    border: '1px inset #c0c0c0',
    background: '#c0c0c0',
    position: 'relative',
    overflow: 'hidden',
    visibility: isVisible ? 'visible' : 'hidden',
  };

  const barStyle: React.CSSProperties = {
    height: '100%',
    width: '30%',
    background: 'linear-gradient(90deg, #000080 0%, #0000ff 50%, #000080 100%)',
    position: 'absolute',
    left: `${(progress / 100) * 70}%`,
    transition: 'none',
    border: '1px solid #808080',
    boxSizing: 'border-box',
    boxShadow: 'inset 1px 1px 0px rgba(255,255,255,0.5)',
  };

  return (
    <div style={containerStyle}>
      {isVisible && <div style={barStyle} />}
    </div>
  );
};

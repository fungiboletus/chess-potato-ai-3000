import { useState, useEffect } from 'react';

interface AnimatedProgressBarProps {
  isVisible: boolean;
  width?: number;
  height?: number;
}

export const AnimatedProgressBar: React.FC<AnimatedProgressBarProps> = ({
  isVisible,
  width = 200,
  height = 16,
}) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isVisible) {
      setProgress(0);
      return;
    }

    const interval = setInterval(() => {
      setProgress((prev) => (prev + 5) % 100);
    }, 100);

    return () => clearInterval(interval);
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div 
      className="progress-indicator segmented"
      style={{ width: `${width}px`, height: `${height}px` }}
    >
      <span 
        className="progress-indicator-bar" 
        style={{ width: `${progress}%` }} 
      />
    </div>
  );
};

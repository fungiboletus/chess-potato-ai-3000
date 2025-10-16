import { useState, useEffect, useRef } from 'react';

interface AnimatedProgressBarProps {
  isVisible?: boolean;
  width?: number | string;
  height?: number;
}

export const AnimatedProgressBar: React.FC<AnimatedProgressBarProps> = ({
  isVisible = true,
  width = 200,
  height = 32,
}) => {
  const [progress, setProgress] = useState(0);
  const divRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isVisible) {
      return;
    }

    // max blocks
    const padding = 7.9; // 4px padding on each side
    const containerWidth = (divRef.current?.offsetWidth || 200) - padding;
    // from 98.css
    const block_width = 18.0;
    const maxBlocks = containerWidth / block_width;

    const interval = setInterval(() => {
      setProgress((prev) => (prev + 100 / maxBlocks) % 100);
    }, 100);

    return () => clearInterval(interval);
  }, [isVisible]);

  if (typeof width === 'number') {
    width = `${width}px`;
  }

  return (
    <div
      className="progress-indicator segmented"
      style={{ width, height: `${height}px` }}
      ref={divRef}
    >
      <span
        className="progress-indicator-bar"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
};

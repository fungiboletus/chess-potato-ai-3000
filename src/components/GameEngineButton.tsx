import React from 'react';

interface GameEngineButtonProps {
  isAIThinking: boolean;
}

export const GameEngineButton: React.FC<GameEngineButtonProps> = ({ isAIThinking }) => {
  return (
    <>
      <img src="./art.png" alt="" className="pixelated" style={{ display: isAIThinking ? 'none' : 'block' }} />
      <img src="./art.apng" alt="" className="pixelated" style={{ display: isAIThinking ? 'block' : 'none' }} />
    </>
  );
};

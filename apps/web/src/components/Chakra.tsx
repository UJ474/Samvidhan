import React from 'react';

interface ChakraProps {
  size?: number;
  className?: string;
  spinning?: boolean;
}

export const Chakra: React.FC<ChakraProps> = ({ size = 32, className = '', spinning = false }) => {
  return (
    <img
      src="./chakra.svg"
      alt="Ashoka Chakra"
      width={size}
      height={size}
      className={className}
      style={{
        display: 'inline-block',
        verticalAlign: 'middle',
        animation: spinning ? 'spin 12s linear infinite' : undefined,
      }}
    />
  );
};

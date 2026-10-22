import React, { useRef, useState, useEffect } from 'react';
import { SLICES, ORGANS, planSpin, sliceUnderPointer, type Organ, type SpinPlan } from '@samvidhan/core';
import { sounds } from '../services/sound.js';

interface SpinningWheelProps {
  onSpinComplete?: (winner: Organ) => void;
  targetWinner?: Organ; // If provided (e.g. from server in live game)
  targetSeed?: number;   // If provided (e.g. from server in live game)
  disabled?: boolean;
  size?: number; // default 360
  showSpinButton?: boolean;
}

export const SpinningWheel: React.FC<SpinningWheelProps> = ({
  onSpinComplete,
  targetWinner,
  targetSeed,
  disabled = false,
  size = 360,
  showSpinButton = true,
}) => {
  const [rotation, setRotation] = useState<number>(0);
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [pointerFlick, setPointerFlick] = useState<number>(0);
  const [landedOrgan, setLandedOrgan] = useState<Organ | null>(null);

  const currentRotationRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);

  const radius = size / 2;
  const sliceAngle = 360 / SLICES;

  const sliceConfig = [
    { organ: 'Legislature' as Organ, color: '#D9731A', textColor: '#FFFFFF', label: 'LEGISLATURE' },
    { organ: 'Executive' as Organ, color: '#FBF7EE', textColor: '#16213A', label: 'EXECUTIVE' },
    { organ: 'Judiciary' as Organ, color: '#1E6B49', textColor: '#FFFFFF', label: 'JUDICIARY' },
    { organ: 'Legislature' as Organ, color: '#D9731A', textColor: '#FFFFFF', label: 'LEGISLATURE' },
    { organ: 'Executive' as Organ, color: '#FBF7EE', textColor: '#16213A', label: 'EXECUTIVE' },
    { organ: 'Judiciary' as Organ, color: '#1E6B49', textColor: '#FFFFFF', label: 'JUDICIARY' },
  ];

  const triggerSpin = (winnerOverride?: Organ, seedOverride?: number) => {
    if (isSpinning) return;

    // Pick winner uniformly if not provided
    const winner = winnerOverride || targetWinner || ORGANS[Math.floor(Math.random() * ORGANS.length)];
    const seed = seedOverride !== undefined ? seedOverride : targetSeed !== undefined ? targetSeed : Math.floor(Math.random() * 1000000);

    const plan: SpinPlan = planSpin(winner, seed);
    setIsSpinning(true);
    setLandedOrgan(null);

    const startRot = currentRotationRef.current % 360;
    const finalRot = currentRotationRef.current + plan.finalRotation;
    const duration = plan.durationMs;
    const startTime = performance.now();
    let lastSliceIndex = sliceUnderPointer(startRot);

    // Custom cubic-bezier approximation: (0.12, 0.8, 0.18, 1)
    const easeOutCubic = (t: number): number => {
      return 1 - Math.pow(1 - t, 4);
    };

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const eased = easeOutCubic(progress);
      const current = startRot + (finalRot - startRot) * eased;

      currentRotationRef.current = current;
      setRotation(current);

      // Check if a peg passed the top pointer
      const currentSlice = sliceUnderPointer(current);
      if (currentSlice !== lastSliceIndex) {
        lastSliceIndex = currentSlice;
        sounds.playPegTick();
        setPointerFlick(12);
        setTimeout(() => setPointerFlick(0), 40);
      }

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        setIsSpinning(false);
        const resolvedWinner = ORGANS[sliceUnderPointer(current) % 3];
        setLandedOrgan(resolvedWinner);
        sounds.playWheelLand();
        if (onSpinComplete) {
          onSpinComplete(resolvedWinner);
        }
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);
  };

  // If targetWinner & targetSeed are provided externally (e.g. Socket.IO live sync), trigger spin automatically
  useEffect(() => {
    if (targetWinner && targetSeed !== undefined && !isSpinning) {
      triggerSpin(targetWinner, targetSeed);
    }
  }, [targetWinner, targetSeed]);

  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center relative select-none">
      {/* Top Pointer (Bookmark tab that flicks) */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          marginBottom: -16,
          transform: `rotate(${pointerFlick}deg)`,
          transformOrigin: 'top center',
          transition: 'transform 40ms ease',
        }}
      >
        <svg width="34" height="42" viewBox="0 0 34 42" fill="none">
          <path
            d="M17 40 L4 12 Q2 4 10 4 L24 4 Q32 4 30 12 Z"
            fill="#16213A"
            stroke="#FBF7EE"
            strokeWidth="2.5"
          />
          <circle cx="17" cy="14" r="3.5" fill="#D9731A" />
        </svg>
      </div>

      {/* Wheel SVG */}
      <div
        style={{
          width: size,
          height: size,
          filter: 'drop-shadow(3px 4px 0px #16213A)',
        }}
        className="relative"
      >
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          style={{
            transform: `rotate(${rotation}deg)`,
            transformOrigin: 'center center',
          }}
        >
          {/* Wheel Background & Border */}
          <circle cx={radius} cy={radius} r={radius - 4} fill="#FBF7EE" stroke="#16213A" strokeWidth="4" />

          {/* Slices */}
          {sliceConfig.map((slice, i) => {
            const startAngle = i * sliceAngle;
            const endAngle = (i + 1) * sliceAngle;
            const startRad = (Math.PI / 180) * (startAngle - 90);
            const endRad = (Math.PI / 180) * (endAngle - 90);

            const x1 = radius + (radius - 6) * Math.cos(startRad);
            const y1 = radius + (radius - 6) * Math.sin(startRad);
            const x2 = radius + (radius - 6) * Math.cos(endRad);
            const y2 = radius + (radius - 6) * Math.sin(endRad);

            const pathData = `M ${radius} ${radius} L ${x1} ${y1} A ${radius - 6} ${radius - 6} 0 0 1 ${x2} ${y2} Z`;

            // Mid angle for text
            const midAngle = startAngle + sliceAngle / 2;
            const textRad = (Math.PI / 180) * (midAngle - 90);
            const textX = radius + (radius * 0.62) * Math.cos(textRad);
            const textY = radius + (radius * 0.62) * Math.sin(textRad);

            return (
              <g key={i}>
                <path d={pathData} fill={slice.color} stroke="#16213A" strokeWidth="2.5" />
                <text
                  x={textX}
                  y={textY}
                  fill={slice.textColor}
                  fontSize={size > 300 ? 11 : 9}
                  fontWeight="700"
                  fontFamily="'Young Serif', serif"
                  letterSpacing="1px"
                  textAnchor="middle"
                  dominantBaseline="central"
                  transform={`rotate(${midAngle + 90}, ${textX}, ${textY})`}
                >
                  {slice.label}
                </text>
              </g>
            );
          })}

          {/* Brass Pegs at Dividers */}
          {sliceConfig.map((_, i) => {
            const angle = i * sliceAngle - 90;
            const rad = (Math.PI / 180) * angle;
            const pegX = radius + (radius - 12) * Math.cos(rad);
            const pegY = radius + (radius - 12) * Math.sin(rad);
            return (
              <g key={`peg-${i}`}>
                <circle cx={pegX} cy={pegY} r="4.5" fill="#D9731A" stroke="#16213A" strokeWidth="2" />
                <circle cx={pegX - 1} cy={pegY - 1} r="1.5" fill="#FFF" />
              </g>
            );
          })}

          {/* Center Ashoka Chakra Hub */}
          <circle cx={radius} cy={radius} r="38" fill="#FBF7EE" stroke="#16213A" strokeWidth="3" />
          <image
            href="./chakra.svg"
            x={radius - 32}
            y={radius - 32}
            width="64"
            height="64"
          />
        </svg>
      </div>

      {/* Landing Pill or Spin Button */}
      {showSpinButton && (
        <div style={{ marginTop: '1.5rem' }}>
          <button
            onClick={() => triggerSpin()}
            disabled={disabled || isSpinning}
            className="civic-btn civic-btn-primary"
            style={{
              padding: '0.85rem 2rem',
              fontSize: '1.1rem',
              opacity: disabled || isSpinning ? 0.6 : 1,
            }}
          >
            {isSpinning ? 'Spinning...' : 'Spin the Wheel'}
          </button>
        </div>
      )}

      {landedOrgan && !isSpinning && (
        <div
          style={{
            marginTop: '1rem',
            padding: '0.4rem 1.25rem',
            backgroundColor: landedOrgan === 'Legislature' ? '#D9731A' : landedOrgan === 'Judiciary' ? '#1E6B49' : '#FBF7EE',
            color: landedOrgan === 'Executive' ? '#16213A' : '#FFFFFF',
            border: '2px solid #16213A',
            borderRadius: 20,
            boxShadow: '2px 2px 0px #16213A',
            fontFamily: "'Young Serif', serif",
            fontSize: '1.1rem',
          }}
        >
          Landed on {landedOrgan}!
        </div>
      )}
    </div>
  );
};

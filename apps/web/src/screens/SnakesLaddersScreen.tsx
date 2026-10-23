import React, { useState } from 'react';
import {
  SNAKES_BOARD,
  canMove,
  checkTileEvent,
  resolveSpecialTile,
  getRandomQuestions,
  getTileOrgan,
  type Article,
  type Question,
} from '@samvidhan/core';
import { storage } from '../services/storage.js';
import { sounds } from '../services/sound.js';
import confetti from 'canvas-confetti';

interface SnakesLaddersScreenProps {
  onBack: () => void;
}

interface Player {
  id: string;
  name: string;
  pos: number; // 0 is start, 1..30
  color: string;
}

// Boustrophedon center coordinate helper for 30 squares (6 cols x 5 rows)
// Rows: r=0 is bottom (sq 1-6), r=4 is top (sq 25-30)
const getSquareCenter = (sq: number): { x: number; y: number } => {
  const r = Math.floor((sq - 1) / 6); // 0 (bottom) to 4 (top)
  const displayRow = 4 - r; // 0 (top row) to 4 (bottom row)
  const colInRow = (sq - 1) % 6;
  const displayCol = r % 2 === 1 ? 5 - colInRow : colInRow;

  // Percentage within the SVG viewport (0..100)
  const x = (displayCol + 0.5) * (100 / 6);
  const y = (displayRow + 0.5) * (100 / 5);
  return { x, y };
};

export const SnakesLaddersScreen: React.FC<SnakesLaddersScreenProps> = ({ onBack }) => {
  const [players, setPlayers] = useState<Player[]>([
    { id: 'p1', name: 'Player 1', pos: 0, color: '#243B8C' },
    { id: 'p2', name: 'Player 2', pos: 0, color: '#D9731A' },
  ]);
  const [turn, setTurn] = useState<number>(0);
  const [diceVal, setDiceVal] = useState<number | null>(null);
  const [isRolling, setIsRolling] = useState<boolean>(false);
  const [gameMessage, setGameMessage] = useState<string>('First player to reach square 30 (SAMVIDHAN HOME) wins!');
  const [winner, setWinner] = useState<Player | null>(null);
  const [hoppingPlayerId, setHoppingPlayerId] = useState<string | null>(null);

  // Question Challenge Modal State
  const [activeChallenge, setActiveChallenge] = useState<{
    type: 'ladder' | 'snake';
    from: number;
    to: number;
    article: Article;
    question: Question;
  } | null>(null);

  const activePlayer = players[turn];

  const rollDice = async () => {
    if (isRolling || winner || activeChallenge) return;

    setIsRolling(true);
    sounds.playDiceRoll();

    // Dice animation frames with sound ticks
    let finalRoll = 1;
    for (let i = 0; i < 8; i++) {
      finalRoll = 1 + Math.floor(Math.random() * 6);
      setDiceVal(finalRoll);
      await new Promise((r) => setTimeout(r, 60 + i * 15));
    }

    setIsRolling(false);

    // Evaluate Move
    const currentPos = activePlayer.pos;
    if (!canMove(currentPos, finalRoll, SNAKES_BOARD.size)) {
      setGameMessage(`${activePlayer.name} rolled ${finalRoll} — needs exact roll to reach square 30!`);
      advanceTurn();
      return;
    }

    const targetPos = currentPos + finalRoll;

    // Hop square-by-square with visual bounce
    setHoppingPlayerId(activePlayer.id);
    let step = currentPos;
    while (step < targetPos) {
      step++;
      sounds.playPegTick();
      updatePlayerPos(turn, step);
      await new Promise((r) => setTimeout(r, 160));
    }
    setHoppingPlayerId(null);

    // Check special tile event (ladder, snake, or win)
    const event = checkTileEvent(targetPos, SNAKES_BOARD);

    if (event.type === 'win') {
      setWinner(activePlayer);
      setGameMessage(`★ ${activePlayer.name.toUpperCase()} REACHED SAMVIDHAN HOME AND WINS! ★`);
      storage.incrementMode('snakes', 100);
      sounds.playCorrect();
      try {
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
      } catch {}
      return;
    }

    if (event.type === 'ladder' || event.type === 'snake') {
      // Pick random question challenge
      const [challenge] = getRandomQuestions(1);
      setActiveChallenge({
        type: event.type,
        from: targetPos,
        to: event.to!,
        article: challenge.article,
        question: challenge.question,
      });
      return;
    }

    // Normal safe square
    setGameMessage(`${activePlayer.name} landed safely on Square ${targetPos}.`);
    advanceTurn();
  };

  const updatePlayerPos = (playerIndex: number, newPos: number) => {
    setPlayers((prev) =>
      prev.map((p, idx) => (idx === playerIndex ? { ...p, pos: newPos } : p))
    );
  };

  const advanceTurn = () => {
    setTurn((prev) => (prev + 1) % players.length);
  };

  const handleChallengeAnswer = (selectedIdx: number) => {
    if (!activeChallenge) return;

    const isCorrect = selectedIdx === activeChallenge.question.answer;
    if (isCorrect) {
      sounds.playCorrect();
    } else {
      sounds.playWrong();
    }

    const res = resolveSpecialTile(
      activeChallenge.from,
      isCorrect,
      SNAKES_BOARD
    );

    updatePlayerPos(turn, res.finalPos);
    setGameMessage(res.message);
    setActiveChallenge(null);

    // If climbed directly into square 30
    if (res.finalPos === SNAKES_BOARD.size) {
      setWinner(activePlayer);
      setGameMessage(`★ ${activePlayer.name.toUpperCase()} CLIMBED TO HOME AND WINS! ★`);
      try {
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
      } catch {}
      return;
    }

    advanceTurn();
  };

  // Render 30-square board in boustrophedon order (top row 30 down to bottom row 1)
  const rows = [];
  const { size, cols, ladders, snakes } = SNAKES_BOARD;
  const numRows = size / cols;

  for (let r = numRows - 1; r >= 0; r--) {
    let rowNums = Array.from({ length: cols }, (_, c) => r * cols + c + 1);
    if (r % 2 === 1) {
      rowNums.reverse(); // Alternating serpentine row direction
    }
    rows.push(rowNums);
  }

  // Ladder connections: [from, to]
  const ladderPairs: [number, number][] = Object.entries(ladders).map(([from, to]) => [
    Number(from),
    to,
  ]);

  // Snake connections: [head, tail]
  const snakePairs: [number, number][] = Object.entries(snakes).map(([head, tail]) => [
    Number(head),
    tail,
  ]);

  return (
    <div className="container-civic" style={{ maxWidth: 860 }}>
      <style>{`
        @keyframes diceRattle {
          0% { transform: rotate(0deg) scale(1); }
          20% { transform: rotate(-18deg) scale(1.18) translateY(-4px); }
          40% { transform: rotate(18deg) scale(1.22) translateY(3px); }
          60% { transform: rotate(-14deg) scale(1.15) translateY(-2px); }
          80% { transform: rotate(10deg) scale(1.1) translateY(2px); }
          100% { transform: rotate(0deg) scale(1); }
        }
        @keyframes tokenHopAnimation {
          0% { transform: scale(1) translateY(0); }
          50% { transform: scale(1.35) translateY(-10px); }
          100% { transform: scale(1) translateY(0); }
        }
        .dice-rolling {
          animation: diceRattle 250ms infinite ease-in-out;
        }
        .token-hopping {
          animation: tokenHopAnimation 160ms infinite ease-in-out;
        }
      `}</style>

      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <button onClick={onBack} className="civic-btn" style={{ padding: '0.4rem 0.8rem' }}>
          ✕ Quit Game
        </button>
        <h2 className="font-display" style={{ fontSize: '1.7rem', margin: 0 }}>
          Snakes &amp; Ladders
        </h2>
        <div style={{ width: 80 }} />
      </div>

      {/* Players Bar & Dice Controller */}
      <div
        className="civic-card"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1rem 1.5rem',
          marginBottom: '1.25rem',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
          {players.map((p, i) => (
            <div
              key={p.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.45rem 0.85rem',
                backgroundColor: i === turn ? 'rgba(22, 33, 58, 0.08)' : 'transparent',
                borderRadius: 6,
                border: i === turn ? '2px solid var(--color-ink)' : '2px solid transparent',
              }}
            >
              <span
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  backgroundColor: p.color,
                  display: 'inline-block',
                  border: '2px solid #FFFFFF',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                }}
              />
              <span style={{ fontWeight: i === turn ? 800 : 500, color: 'var(--color-ink)' }}>
                {p.name}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--color-ink-soft)' }}>
                ({p.pos === 0 ? 'Start' : `Sq ${p.pos}`})
              </span>
            </div>
          ))}
        </div>

        {/* Dice & Roll Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {diceVal !== null && (
            <div
              className={isRolling ? 'dice-rolling' : ''}
              style={{
                width: 48,
                height: 48,
                border: '2.5px solid var(--color-ink)',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.6rem',
                fontWeight: 900,
                backgroundColor: '#FFFFFF',
                boxShadow: 'var(--shadow-ink)',
                fontFamily: 'var(--font-mono)',
                color: 'var(--color-ink)',
              }}
            >
              {diceVal}
            </div>
          )}

          {!winner ? (
            <button
              onClick={rollDice}
              disabled={isRolling || activeChallenge !== null}
              className="civic-btn civic-btn-primary"
              style={{ padding: '0.65rem 1.6rem', fontSize: '1rem', fontWeight: 700 }}
            >
              {isRolling ? 'Rolling...' : `${activePlayer.name}: Roll Dice 🎲`}
            </button>
          ) : (
            <button onClick={onBack} className="civic-btn civic-btn-primary" style={{ padding: '0.65rem 1.4rem' }}>
              Play Again / Menu
            </button>
          )}
        </div>
      </div>

      {/* Message Banner */}
      <div
        style={{
          padding: '0.75rem 1rem',
          backgroundColor: 'var(--color-surface)',
          border: '2px solid var(--color-ink)',
          borderRadius: 6,
          marginBottom: '1.25rem',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.9rem',
          fontWeight: 700,
          textAlign: 'center',
        }}
      >
        {gameMessage}
      </div>

      {/* 30-Square Board Container with Overlay SVGs */}
      <div
        style={{
          position: 'relative',
          backgroundColor: 'var(--color-ink)',
          padding: 8,
          borderRadius: 8,
          boxShadow: 'var(--shadow-ink-lg)',
        }}
      >
        {/* SVG Visual Layer for Ladders and Snakes */}
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style={{
            position: 'absolute',
            top: 8,
            left: 8,
            width: 'calc(100% - 16px)',
            height: 'calc(100% - 16px)',
            pointerEvents: 'none',
            zIndex: 3,
          }}
        >
          <defs>
            <filter id="slShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0.5" dy="1.2" stdDeviation="0.8" floodColor="#000000" floodOpacity="0.45" />
            </filter>

            {/* Snake Emerald Pattern Gradient */}
            <linearGradient id="snakeEmerald" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1B5E20" />
              <stop offset="50%" stopColor="#2E7D32" />
              <stop offset="100%" stopColor="#66BB6A" />
            </linearGradient>

            {/* Snake Crimson Pattern Gradient */}
            <linearGradient id="snakeCrimson" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#7F0000" />
              <stop offset="50%" stopColor="#B71C1C" />
              <stop offset="100%" stopColor="#E53935" />
            </linearGradient>

            {/* Ladder Wood Gradient */}
            <linearGradient id="woodRail" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#5D3A1A" />
              <stop offset="50%" stopColor="#A06830" />
              <stop offset="100%" stopColor="#4A2E14" />
            </linearGradient>
          </defs>

          {/* Render Ladders */}
          {ladderPairs.map(([fromSq, toSq]) => {
            const start = getSquareCenter(fromSq);
            const end = getSquareCenter(toSq);
            const dx = end.x - start.x;
            const dy = end.y - start.y;
            const len = Math.hypot(dx, dy);
            if (len === 0) return null;

            // Perpendicular unit vector
            const nx = -dy / len;
            const ny = dx / len;
            const railOffset = 1.9; // Distance of rails from center

            const leftRail = {
              x1: start.x + nx * railOffset,
              y1: start.y + ny * railOffset,
              x2: end.x + nx * railOffset,
              y2: end.y + ny * railOffset,
            };

            const rightRail = {
              x1: start.x - nx * railOffset,
              y1: start.y - ny * railOffset,
              x2: end.x - nx * railOffset,
              y2: end.y - ny * railOffset,
            };

            // Number of rungs
            const rungCount = Math.max(3, Math.round(len / 5.5));
            const rungs = [];
            for (let i = 1; i <= rungCount; i++) {
              const t = i / (rungCount + 1);
              const cx = start.x + dx * t;
              const cy = start.y + dy * t;
              rungs.push({
                x1: cx + nx * railOffset,
                y1: cy + ny * railOffset,
                x2: cx - nx * railOffset,
                y2: cy - ny * railOffset,
              });
            }

            return (
              <g key={`ladder-${fromSq}-${toSq}`} filter="url(#slShadow)">
                {/* Rails */}
                <line
                  x1={leftRail.x1}
                  y1={leftRail.y1}
                  x2={leftRail.x2}
                  y2={leftRail.y2}
                  stroke="#4A2E14"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
                <line
                  x1={leftRail.x1}
                  y1={leftRail.y1}
                  x2={leftRail.x2}
                  y2={leftRail.y2}
                  stroke="#C49A5A"
                  strokeWidth="0.8"
                  strokeLinecap="round"
                />

                <line
                  x1={rightRail.x1}
                  y1={rightRail.y1}
                  x2={rightRail.x2}
                  y2={rightRail.y2}
                  stroke="#4A2E14"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
                <line
                  x1={rightRail.x1}
                  y1={rightRail.y1}
                  x2={rightRail.x2}
                  y2={rightRail.y2}
                  stroke="#C49A5A"
                  strokeWidth="0.8"
                  strokeLinecap="round"
                />

                {/* Wooden Rungs */}
                {rungs.map((r, rIdx) => (
                  <g key={rIdx}>
                    <line
                      x1={r.x1}
                      y1={r.y1}
                      x2={r.x2}
                      y2={r.y2}
                      stroke="#3E2723"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                    />
                    <line
                      x1={r.x1}
                      y1={r.y1}
                      x2={r.x2}
                      y2={r.y2}
                      stroke="#E0B878"
                      strokeWidth="0.5"
                      strokeLinecap="round"
                    />
                  </g>
                ))}
              </g>
            );
          })}

          {/* Render Snakes */}
          {snakePairs.map(([headSq, tailSq], sIdx) => {
            const head = getSquareCenter(headSq);
            const tail = getSquareCenter(tailSq);
            const dx = tail.x - head.x;
            const dy = tail.y - head.y;
            const len = Math.hypot(dx, dy);
            if (len === 0) return null;

            // Perpendicular vector for wave curves
            const nx = -dy / len;
            const ny = dx / len;
            const waveMag = (sIdx % 2 === 0 ? 1 : -1) * 7.5;

            // Undulating cubic bezier path
            const cp1 = {
              x: head.x + dx * 0.28 + nx * waveMag,
              y: head.y + dy * 0.28 + ny * waveMag,
            };
            const cp2 = {
              x: head.x + dx * 0.72 - nx * waveMag,
              y: head.y + dy * 0.72 - ny * waveMag,
            };

            const pathData = `M ${head.x} ${head.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${tail.x} ${tail.y}`;
            const gradId = sIdx % 2 === 0 ? 'url(#snakeEmerald)' : 'url(#snakeCrimson)';

            return (
              <g key={`snake-${headSq}-${tailSq}`} filter="url(#slShadow)">
                {/* Under-shadow */}
                <path
                  d={pathData}
                  fill="none"
                  stroke="rgba(0,0,0,0.4)"
                  strokeWidth="3.4"
                  strokeLinecap="round"
                />

                {/* Snake Body */}
                <path
                  d={pathData}
                  fill="none"
                  stroke={gradId}
                  strokeWidth="2.8"
                  strokeLinecap="round"
                />

                {/* Snake Scales Pattern */}
                <path
                  d={pathData}
                  fill="none"
                  stroke="#FFEB3B"
                  strokeWidth="0.8"
                  strokeDasharray="1.2 2.6"
                  strokeLinecap="round"
                  opacity="0.9"
                />

                {/* Tail Tip */}
                <circle cx={tail.x} cy={tail.y} r="0.8" fill="#1B5E20" />

                {/* Snake Head */}
                <g transform={`translate(${head.x}, ${head.y})`}>
                  <ellipse cx="0" cy="0" rx="2.4" ry="2.0" fill={sIdx % 2 === 0 ? '#1B5E20' : '#B71C1C'} />
                  {/* Yellow Menacing Eyes */}
                  <circle cx="-0.8" cy="-0.6" r="0.55" fill="#FFEB3B" />
                  <circle cx="-0.8" cy="-0.6" r="0.25" fill="#000000" />
                  <circle cx="0.8" cy="-0.6" r="0.55" fill="#FFEB3B" />
                  <circle cx="0.8" cy="-0.6" r="0.25" fill="#000000" />
                  {/* Flicking Forked Tongue */}
                  <path
                    d="M 0 1.9 L 0 3.2 L -0.5 3.9 M 0 3.2 L 0.5 3.9"
                    fill="none"
                    stroke="#D50000"
                    strokeWidth="0.5"
                    strokeLinecap="round"
                  />
                </g>
              </g>
            );
          })}
        </svg>

        {/* 30-Square Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(6, 1fr)',
            gap: 6,
          }}
        >
          {rows.map((row) =>
            row.map((sq) => {
              const isLadder = Boolean(ladders[sq]);
              const isSnake = Boolean(snakes[sq]);
              const isHome = sq === 30;
              const organ = getTileOrgan(sq);

              let tileBg = '#FBF7EE';
              if (organ === 'Legislature') tileBg = '#FFF4E8';
              if (organ === 'Judiciary') tileBg = '#EBF6F0';

              return (
                <div
                  key={sq}
                  style={{
                    height: 94,
                    backgroundColor: isHome ? '#F8E9C0' : tileBg,
                    borderRadius: 4,
                    padding: '0.35rem 0.45rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    position: 'relative',
                    border: isHome ? '2.5px solid #B8860B' : '1px solid rgba(22, 33, 58, 0.2)',
                  }}
                >
                  {/* Square Number & Indicator */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.85rem',
                        fontWeight: 800,
                        color: 'var(--color-ink)',
                      }}
                    >
                      {sq}
                    </span>

                    {isHome && (
                      <span
                        style={{
                          fontSize: '0.65rem',
                          fontWeight: 800,
                          color: '#B8860B',
                          fontFamily: 'var(--font-mono)',
                          backgroundColor: 'rgba(184, 134, 11, 0.15)',
                          padding: '0.1rem 0.35rem',
                          borderRadius: 3,
                        }}
                      >
                        HOME 🏛️
                      </span>
                    )}

                    {isLadder && (
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          color: '#1E6B49',
                          fontFamily: 'var(--font-mono)',
                          backgroundColor: '#EBF6F0',
                          padding: '0.1rem 0.35rem',
                          borderRadius: 3,
                          border: '1px solid #1E6B49',
                        }}
                      >
                        🪜 UP {ladders[sq]}
                      </span>
                    )}

                    {isSnake && (
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          color: '#B3261E',
                          fontFamily: 'var(--font-mono)',
                          backgroundColor: '#FDE8E8',
                          padding: '0.1rem 0.35rem',
                          borderRadius: 3,
                          border: '1px solid #B3261E',
                        }}
                      >
                        🐍 BITE {snakes[sq]}
                      </span>
                    )}
                  </div>

                  {/* Player Tokens on this square */}
                  <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center', zIndex: 4 }}>
                    {players.map(
                      (p) =>
                        p.pos === sq && (
                          <div
                            key={p.id}
                            className={hoppingPlayerId === p.id ? 'token-hopping' : ''}
                            style={{
                              width: 24,
                              height: 24,
                              borderRadius: '50%',
                              backgroundColor: p.color,
                              border: '2.5px solid #FFFFFF',
                              boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#FFFFFF',
                              fontSize: '0.65rem',
                              fontWeight: 900,
                              fontFamily: 'var(--font-mono)',
                            }}
                          >
                            {p.id === 'p1' ? '1' : '2'}
                          </div>
                        )
                    )}
                  </div>

                  {/* Organ subtle marker */}
                  <div
                    style={{
                      fontSize: '0.65rem',
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--color-ink-subtle)',
                      textAlign: 'right',
                    }}
                  >
                    {organ}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Question Challenge Modal on Ladder or Snake */}
      {activeChallenge && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 22, 38, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <div
            className="civic-card"
            style={{
              maxWidth: 580,
              width: '100%',
              padding: '2rem',
              borderTop: `8px solid ${activeChallenge.type === 'ladder' ? '#1E6B49' : '#B3261E'}`,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 800,
                  fontSize: '0.95rem',
                  color: activeChallenge.type === 'ladder' ? '#1E6B49' : '#B3261E',
                }}
              >
                {activeChallenge.type === 'ladder'
                  ? `↑ 🪜 LADDER CLIMB CHALLENGE (Square ${activeChallenge.from} ➔ ${activeChallenge.to})`
                  : `↓ 🐍 SNAKE DEFENSE (Square ${activeChallenge.from} ➔ ${activeChallenge.to})`}
              </span>
              <span className={`organ-badge organ-badge-${activeChallenge.article.organ.toLowerCase()}`}>
                {activeChallenge.article.organ}
              </span>
            </div>

            <p style={{ fontSize: '0.9rem', color: 'var(--color-ink-soft)', marginBottom: '1.25rem' }}>
              <strong>{activePlayer.name}:</strong> Answer correctly to{' '}
              {activeChallenge.type === 'ladder' ? 'climb the ladder' : 'escape sliding down the snake'}!
            </p>

            <h3 className="font-display" style={{ fontSize: '1.35rem', marginBottom: '1.5rem', color: 'var(--color-ink)' }}>
              {activeChallenge.question.q}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {activeChallenge.question.options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => handleChallengeAnswer(i)}
                  className="civic-btn"
                  style={{ justifyContent: 'flex-start', padding: '0.85rem 1.25rem', textAlign: 'left' }}
                >
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, marginRight: '0.75rem' }}>
                    [{i + 1}]
                  </span>
                  <span>{opt}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

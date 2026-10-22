import React, { useState } from 'react';
import { SNAKES_BOARD, canMove, checkTileEvent, resolveSpecialTile, getRandomQuestions, getTileOrgan, type Article, type Question } from '@samvidhan/core';
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

export const SnakesLaddersScreen: React.FC<SnakesLaddersScreenProps> = ({ onBack }) => {
  const [players, setPlayers] = useState<Player[]>([
    { id: 'p1', name: 'Player 1', pos: 0, color: '#243B8C' },
    { id: 'p2', name: 'Player 2', pos: 0, color: '#D9731A' },
  ]);
  const [turn, setTurn] = useState<number>(0);
  const [diceVal, setDiceVal] = useState<number | null>(null);
  const [isRolling, setIsRolling] = useState<boolean>(false);
  const [gameMessage, setGameMessage] = useState<string>('First player to reach square 30 (HOME) wins!');
  const [winner, setWinner] = useState<Player | null>(null);

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

    // Dice animation frames
    let finalRoll = 1;
    for (let i = 0; i < 7; i++) {
      finalRoll = 1 + Math.floor(Math.random() * 6);
      setDiceVal(finalRoll);
      await new Promise((r) => setTimeout(r, 60 + i * 15));
    }

    setIsRolling(false);

    // Evaluate Move
    const currentPos = activePlayer.pos;
    if (!canMove(currentPos, finalRoll, SNAKES_BOARD.size)) {
      setGameMessage(`${activePlayer.name} rolled ${finalRoll} — needs exact roll to reach 30!`);
      advanceTurn();
      return;
    }

    const targetPos = currentPos + finalRoll;

    // Hop square-by-square
    let step = currentPos;
    while (step < targetPos) {
      step++;
      sounds.playPegTick();
      updatePlayerPos(turn, step);
      await new Promise((r) => setTimeout(r, 140));
    }

    // Check special tile event (ladder, snake, or win)
    const event = checkTileEvent(targetPos, SNAKES_BOARD);

    if (event.type === 'win') {
      setWinner(activePlayer);
      setGameMessage(`★ ${activePlayer.name.toUpperCase()} WINS THE GAME! ★`);
      storage.incrementMode('snakes', 100);
      try {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
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

    setGameMessage(`${activePlayer.name} rolled ${finalRoll} and moved to square ${targetPos}.`);
    advanceTurn();
  };

  const updatePlayerPos = (playerIndex: number, newPos: number) => {
    setPlayers((prev) => {
      const copy = [...prev];
      copy[playerIndex] = { ...copy[playerIndex], pos: newPos };
      return copy;
    });
  };

  const advanceTurn = () => {
    setTurn((t) => (t + 1) % players.length);
  };

  const handleChallengeAnswer = (choiceIndex: number) => {
    if (!activeChallenge) return;

    const isCorrect = choiceIndex === activeChallenge.question.answer;
    const res = resolveSpecialTile(activeChallenge.from, isCorrect, SNAKES_BOARD);

    if (isCorrect) {
      sounds.playCorrect();
    } else {
      sounds.playWrong();
    }

    updatePlayerPos(turn, res.finalPos);
    setGameMessage(res.message);
    setActiveChallenge(null);

    // If climbed directly into square 30
    if (res.finalPos === SNAKES_BOARD.size) {
      setWinner(activePlayer);
      setGameMessage(`★ ${activePlayer.name.toUpperCase()} WINS THE GAME! ★`);
      try {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
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

  return (
    <div className="container-civic" style={{ maxWidth: 860 }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <button onClick={onBack} className="civic-btn" style={{ padding: '0.4rem 0.8rem' }}>
          ✕ Quit Game
        </button>
        <h2 className="font-display" style={{ fontSize: '1.6rem', margin: 0 }}>
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
          marginBottom: '1.5rem',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          {players.map((p, i) => (
            <div
              key={p.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.4rem 0.8rem',
                backgroundColor: i === turn ? 'rgba(22, 33, 58, 0.08)' : 'transparent',
                borderRadius: 4,
                border: i === turn ? '2px solid var(--color-ink)' : '2px solid transparent',
              }}
            >
              <span style={{ width: 14, height: 14, borderRadius: '50%', backgroundColor: p.color, display: 'inline-block' }} />
              <span style={{ fontWeight: i === turn ? 700 : 500, color: 'var(--color-ink)' }}>
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
              style={{
                width: 44,
                height: 44,
                border: '2px solid var(--color-ink)',
                borderRadius: 6,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                fontWeight: 800,
                backgroundColor: '#FFFFFF',
                boxShadow: 'var(--shadow-ink)',
                fontFamily: 'var(--font-mono)',
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
              style={{ padding: '0.65rem 1.5rem' }}
            >
              {isRolling ? 'Rolling...' : `${activePlayer.name}: Roll Dice 🎲`}
            </button>
          ) : (
            <button onClick={onBack} className="civic-btn civic-btn-primary">
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
          borderRadius: 4,
          marginBottom: '1.5rem',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.9rem',
          fontWeight: 600,
          textAlign: 'center',
        }}
      >
        {gameMessage}
      </div>

      {/* 30-Square Board Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6, 1fr)',
          gap: 6,
          backgroundColor: 'var(--color-ink)',
          padding: 8,
          borderRadius: 6,
          boxShadow: 'var(--shadow-ink-lg)',
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
                  height: 90,
                  backgroundColor: isHome ? '#F8E9C0' : tileBg,
                  borderRadius: 4,
                  padding: '0.4rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  position: 'relative',
                  border: isHome ? '2px solid #B8860B' : '1px solid rgba(22, 33, 58, 0.2)',
                }}
              >
                {/* Square Number & Indicator */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-ink)' }}>
                    {sq}
                  </span>
                  {isHome && (
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#B8860B', fontFamily: 'var(--font-mono)' }}>
                      HOME 🏛️
                    </span>
                  )}
                  {isLadder && (
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1E6B49', fontFamily: 'var(--font-mono)' }}>
                      ↑{ladders[sq]}
                    </span>
                  )}
                  {isSnake && (
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#B3261E', fontFamily: 'var(--font-mono)' }}>
                      ↓{snakes[sq]}
                    </span>
                  )}
                </div>

                {/* Tokens on this square */}
                <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center' }}>
                  {players.map(
                    (p) =>
                      p.pos === sq && (
                        <div
                          key={p.id}
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: '50%',
                            backgroundColor: p.color,
                            border: '2px solid #FFFFFF',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                          }}
                        />
                      )
                  )}
                </div>

                {/* Organ small label */}
                <div style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--color-ink-subtle)', textAlign: 'right' }}>
                  {organ[0]}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Question Challenge Modal on Ladder or Snake */}
      {activeChallenge && (
        <div
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
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
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  color: activeChallenge.type === 'ladder' ? '#1E6B49' : '#B3261E',
                }}
              >
                {activeChallenge.type === 'ladder'
                  ? `↑ LADDER CHALLENGE (${activeChallenge.from} ➔ ${activeChallenge.to})`
                  : `↓ SNAKE DEFENSE (${activeChallenge.from} ➔ ${activeChallenge.to})`}
              </span>
              <span className={`organ-badge organ-badge-${activeChallenge.article.organ.toLowerCase()}`}>
                {activeChallenge.article.organ}
              </span>
            </div>

            <p style={{ fontSize: '0.9rem', color: 'var(--color-ink-soft)', marginBottom: '1.25rem' }}>
              {activePlayer.name}: Answer correctly to{' '}
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

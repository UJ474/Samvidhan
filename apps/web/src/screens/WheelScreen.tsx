import React, { useState } from 'react';
import { getRandomQuestionForOrgan, getScoreSummary, type Organ, type Article, type Question } from '@samvidhan/core';
import { SpinningWheel } from '../components/SpinningWheel.js';
import { storage } from '../services/storage.js';
import { sounds } from '../services/sound.js';
import confetti from 'canvas-confetti';

interface WheelScreenProps {
  onBack: () => void;
}

export const WheelScreen: React.FC<WheelScreenProps> = ({ onBack }) => {
  const TOTAL_ROUNDS = 5;
  const [round, setRound] = useState<number>(1);
  const [score, setScore] = useState<number>(0);
  const [phase, setPhase] = useState<'SPIN' | 'QUESTION' | 'RESULTS'>('SPIN');
  const [landedOrgan, setLandedOrgan] = useState<Organ | null>(null);
  const [currentChallenge, setCurrentChallenge] = useState<{ article: Article; question: Question } | null>(null);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState<boolean>(false);

  const handleWheelLanded = (winner: Organ) => {
    setLandedOrgan(winner);
    const challenge = getRandomQuestionForOrgan(winner);
    if (challenge) {
      setCurrentChallenge(challenge);
      // Short dramatic pause after wheel landing before displaying question card
      setTimeout(() => {
        setPhase('QUESTION');
        setSelectedChoice(null);
        setIsAnswered(false);
      }, 1200);
    }
  };

  const handleAnswer = (choiceIndex: number) => {
    if (isAnswered || !currentChallenge) return;

    setSelectedChoice(choiceIndex);
    setIsAnswered(true);

    const isCorrect = choiceIndex === currentChallenge.question.answer;
    storage.recordAnswer(currentChallenge.article.organ, isCorrect);

    if (isCorrect) {
      setScore((s) => s + 1);
      sounds.playCorrect();
    } else {
      sounds.playWrong();
    }
  };

  const handleNextRound = () => {
    if (round < TOTAL_ROUNDS) {
      setRound((r) => r + 1);
      setPhase('SPIN');
      setLandedOrgan(null);
      setCurrentChallenge(null);
      sounds.playPegTick();
    } else {
      setPhase('RESULTS');
      storage.incrementMode('wheel', score);
      if (score >= 3) {
        try {
          confetti({ particleCount: 75, spread: 60, origin: { y: 0.6 } });
        } catch {}
      }
    }
  };

  // View: Final Results
  if (phase === 'RESULTS') {
    const summary = getScoreSummary(score, TOTAL_ROUNDS);
    const starStr = '★'.repeat(summary.stars) + '☆'.repeat(5 - summary.stars);
    const stampColor = summary.themeColor === 'green' ? '#1E6B49' : summary.themeColor === 'gold' ? '#B8860B' : '#B3261E';

    return (
      <div className="container-civic" style={{ maxWidth: 680, textAlign: 'center' }}>
        <h2 className="font-display" style={{ fontSize: '2.4rem', marginBottom: '0.5rem' }}>
          Wheel Challenge Complete
        </h2>
        <p className="font-body" style={{ fontSize: '1.15rem', color: 'var(--color-ink-soft)', marginBottom: '2rem' }}>
          5-Round Constitutional Spin Session
        </p>

        {/* Circular Stamp */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2.5rem' }}>
          <div
            className="result-stamp"
            style={{
              borderColor: stampColor,
              color: stampColor,
              width: 220,
              height: 220,
            }}
          >
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', letterSpacing: '2px', fontWeight: 700 }}>
              SPIN THE WHEEL
            </div>
            <div className="font-display" style={{ fontSize: '3.4rem', lineHeight: 1.1 }}>
              {score}/{TOTAL_ROUNDS}
            </div>
            <div style={{ fontSize: '1.4rem', color: '#B8860B', margin: '0.2rem 0' }}>
              {starStr}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 600 }}>
              {score >= 4 ? 'EXCELLENT LUCK & SKILL' : score >= 2 ? 'SOLID ATTEMPT' : 'TRY AGAIN'}
            </div>
          </div>
        </div>

        <div className="civic-card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
          <h3 className="font-display" style={{ fontSize: '1.35rem', color: stampColor, marginBottom: '0.5rem' }}>
            {summary.message}
          </h3>
          <p style={{ margin: 0, color: 'var(--color-ink-soft)', fontSize: '0.95rem' }}>
            You scored {score} out of {TOTAL_ROUNDS} rounds by answering questions across institutions.
          </p>
        </div>

        <button onClick={onBack} className="civic-btn civic-btn-primary" style={{ padding: '0.8rem 2.5rem', fontSize: '1.1rem' }}>
          Return to Main Menu
        </button>
      </div>
    );
  }

  // View: Wheel Spin Phase
  if (phase === 'SPIN') {
    return (
      <div className="container-civic" style={{ maxWidth: 720, textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <button onClick={onBack} className="civic-btn" style={{ padding: '0.4rem 0.8rem' }}>
            ✕ Quit
          </button>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.95rem', fontWeight: 600 }}>
            Round {round} of {TOTAL_ROUNDS}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.95rem', color: '#B8860B', fontWeight: 700 }}>
            ★ {score} pts
          </div>
        </div>

        <h2 className="font-display" style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>
          Spin the Wheel
        </h2>
        <p className="font-body" style={{ fontSize: '1.1rem', color: 'var(--color-ink-soft)', marginBottom: '1.5rem' }}>
          Hit Spin to randomly land on Legislature, Executive, or Judiciary
        </p>

        {/* Physical Spinning Wheel */}
        <div style={{ display: 'flex', justifyContent: 'center', margin: '1rem 0 2rem' }}>
          <SpinningWheel onSpinComplete={handleWheelLanded} size={340} />
        </div>
      </div>
    );
  }

  // View: Question Phase
  const { article, question } = currentChallenge!;
  const organColor = landedOrgan === 'Legislature' ? '#D9731A' : landedOrgan === 'Judiciary' ? '#1E6B49' : '#16213A';

  return (
    <div className="container-civic" style={{ maxWidth: 720 }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <span className={`organ-badge organ-badge-${article.organ.toLowerCase()}`}>
          Landed on {article.organ}
        </span>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', fontWeight: 600 }}>
          Round {round} of {TOTAL_ROUNDS}
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.95rem', color: '#B8860B', fontWeight: 700 }}>
          ★ {score} pts
        </div>
      </div>

      {/* Question Card */}
      <div
        className="civic-card"
        style={{
          padding: '2rem 1.75rem',
          borderLeft: `6px solid ${organColor}`,
          marginBottom: '1.5rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--color-ink-soft)' }}>
            Part {article.part} • Article {article.article}
          </span>
          <span style={{ fontSize: '0.85rem', color: 'var(--color-ink-soft)' }}>
            {article.title}
          </span>
        </div>

        <h3 className="font-display" style={{ fontSize: '1.5rem', lineHeight: 1.3, color: 'var(--color-ink)', marginBottom: '1.75rem' }}>
          {question.q}
        </h3>

        {/* Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {question.options.map((opt, i) => {
            let optionBg = 'var(--color-surface)';
            let optionColor = 'var(--color-ink)';
            let borderColor = 'var(--color-ink)';
            let statusSuffix = '';

            if (isAnswered) {
              if (i === question.answer) {
                optionBg = '#1E6B49';
                optionColor = '#FFFFFF';
                borderColor = '#1E6B49';
                statusSuffix = ' ✔';
              } else if (i === selectedChoice) {
                optionBg = '#B3261E';
                optionColor = '#FFFFFF';
                borderColor = '#B3261E';
                statusSuffix = ' ✘';
              } else {
                optionBg = 'var(--color-bg)';
                optionColor = 'var(--color-ink-soft)';
              }
            }

            return (
              <button
                key={i}
                onClick={() => handleAnswer(i)}
                disabled={isAnswered}
                className="civic-btn"
                style={{
                  justifyContent: 'flex-start',
                  padding: '1rem 1.25rem',
                  fontSize: '1.05rem',
                  backgroundColor: optionBg,
                  color: optionColor,
                  borderColor,
                  textAlign: 'left',
                }}
              >
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, marginRight: '0.75rem' }}>
                  [{i + 1}]
                </span>
                <span style={{ flex: 1 }}>{opt}</span>
                {statusSuffix && <span style={{ fontWeight: 800 }}>{statusSuffix}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Explanation Banner */}
      {isAnswered && (
        <div
          className="civic-card"
          style={{
            padding: '1.25rem 1.5rem',
            backgroundColor: selectedChoice === question.answer ? 'rgba(30, 107, 73, 0.08)' : 'rgba(179, 38, 30, 0.08)',
            borderColor: selectedChoice === question.answer ? '#1E6B49' : '#B3261E',
            marginBottom: '1.5rem',
          }}
        >
          <div style={{ fontWeight: 700, color: selectedChoice === question.answer ? '#1E6B49' : '#B3261E', marginBottom: '0.25rem' }}>
            {selectedChoice === question.answer ? '✔ Correct Answer!' : '✘ Incorrect!'}
          </div>
          <p className="font-body" style={{ fontSize: '1.1rem', margin: 0 }}>
            {article.simple}
          </p>
        </div>
      )}

      {/* Continue */}
      {isAnswered && (
        <div style={{ textAlign: 'right' }}>
          <button onClick={handleNextRound} className="civic-btn civic-btn-primary" style={{ padding: '0.75rem 2rem', fontSize: '1.05rem' }}>
            {round < TOTAL_ROUNDS ? 'Next Spin →' : 'Complete Challenge ★'}
          </button>
        </div>
      )}
    </div>
  );
};

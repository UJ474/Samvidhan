import React, { useState, useEffect } from 'react';
import { getAllArticles, type Article } from '@samvidhan/core';
import { storage } from '../services/storage.js';
import { sounds } from '../services/sound.js';

interface FlashCardsScreenProps {
  onBack: () => void;
}

export const FlashCardsScreen: React.FC<FlashCardsScreenProps> = ({ onBack }) => {
  const [deck, setDeck] = useState<Article[]>([]);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [knownCount, setKnownCount] = useState<number>(0);
  const [learningCount, setLearningCount] = useState<number>(0);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  useEffect(() => {
    // Shuffle all 26 articles
    const articles = getAllArticles();
    const shuffled = [...articles].sort(() => Math.random() - 0.5);
    setDeck(shuffled);
  }, []);

  if (deck.length === 0 && !isCompleted) {
    return <div className="container-civic" style={{ textAlign: 'center', padding: '4rem' }}>Preparing deck...</div>;
  }

  const currentArticle = deck[0];

  const handleFlip = () => {
    setIsFlipped((f) => !f);
    sounds.playPegTick();
  };

  const handleKnewIt = () => {
    setKnownCount((c) => c + 1);
    sounds.playCorrect();
    storage.recordAnswer(currentArticle.organ, true);
    nextCard(false);
  };

  const handleStillLearning = () => {
    setLearningCount((c) => c + 1);
    sounds.playWrong();
    storage.recordAnswer(currentArticle.organ, false);
    nextCard(true); // put to end of deck
  };

  const nextCard = (requeue: boolean) => {
    setIsFlipped(false);
    setTimeout(() => {
      setDeck((prev) => {
        const remaining = prev.slice(1);
        if (requeue) {
          remaining.push(prev[0]);
        }
        if (remaining.length === 0) {
          setIsCompleted(true);
          storage.incrementMode('flash', knownCount + 1);
        }
        return remaining;
      });
    }, 200);
  };

  // View: Finished Deck
  if (isCompleted || !currentArticle) {
    const total = knownCount + learningCount;
    return (
      <div className="container-civic" style={{ maxWidth: 640, textAlign: 'center' }}>
        <h2 className="font-display" style={{ fontSize: '2.4rem', marginBottom: '0.5rem' }}>
          Flash Cards Complete
        </h2>
        <p className="font-body" style={{ fontSize: '1.15rem', color: 'var(--color-ink-soft)', marginBottom: '2.5rem' }}>
          Spaced Repetition Review Summary
        </p>

        <div
          className="civic-card"
          style={{
            padding: '2.5rem',
            display: 'flex',
            justifyContent: 'space-around',
            marginBottom: '2rem',
          }}
        >
          <div>
            <div className="font-display" style={{ fontSize: '3rem', color: '#1E6B49' }}>
              {knownCount}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', color: 'var(--color-ink-soft)' }}>
              ✔ KNEW IT
            </div>
          </div>
          <div style={{ borderLeft: '2px dashed var(--color-ink)', height: 80 }} />
          <div>
            <div className="font-display" style={{ fontSize: '3rem', color: '#B3261E' }}>
              {learningCount}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', color: 'var(--color-ink-soft)' }}>
              ✘ STILL LEARNING
            </div>
          </div>
        </div>

        <button onClick={onBack} className="civic-btn civic-btn-primary" style={{ padding: '0.8rem 2.5rem', fontSize: '1.1rem' }}>
          Return to Main Menu
        </button>
      </div>
    );
  }

  const organColor = currentArticle.organ === 'Legislature' ? '#D9731A' : currentArticle.organ === 'Judiciary' ? '#1E6B49' : '#16213A';

  return (
    <div className="container-civic" style={{ maxWidth: 620 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <button onClick={onBack} className="civic-btn" style={{ padding: '0.4rem 0.8rem' }}>
          ✕ Finish Deck
        </button>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', fontWeight: 600 }}>
          {deck.length} Cards Remaining
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
          <span style={{ color: '#1E6B49', fontWeight: 700 }}>✔ {knownCount}</span>
          <span style={{ color: '#B3261E', fontWeight: 700 }}>✘ {learningCount}</span>
        </div>
      </div>

      {/* 3D Physical Card Flip Container */}
      <div
        style={{
          perspective: '1200px',
          width: '100%',
          minHeight: 380,
          margin: '1.5rem 0 2rem',
          cursor: 'pointer',
        }}
        onClick={handleFlip}
      >
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            minHeight: 380,
            transformStyle: 'preserve-3d',
            transition: 'transform 350ms cubic-bezier(0.12, 0.8, 0.18, 1)',
            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          }}
        >
          {/* Card FRONT: Ticket Stub Style with Perforations */}
          <div
            className="ticket-perforated"
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              minHeight: 380,
              backfaceVisibility: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '2.5rem',
              textAlign: 'center',
              backgroundColor: 'var(--color-surface)',
              borderTop: `6px solid ${organColor}`,
            }}
          >
            <div style={{ fontFamily: 'var(--font-mono)', letterSpacing: '3px', fontSize: '0.9rem', color: 'var(--color-ink-soft)', marginBottom: '0.5rem' }}>
              A R T I C L E
            </div>
            <div className="font-display" style={{ fontSize: '4.8rem', lineHeight: 1.1, color: organColor, margin: '0.5rem 0' }}>
              {currentArticle.article}
            </div>
            <div className="font-display" style={{ fontSize: '1.35rem', color: 'var(--color-ink)', maxWidth: 360 }}>
              {currentArticle.title}
            </div>
            <div style={{ marginTop: '1.5rem' }}>
              <span className={`organ-badge organ-badge-${currentArticle.organ.toLowerCase()}`}>
                {currentArticle.organ} • Part {currentArticle.part}
              </span>
            </div>
            <div style={{ position: 'absolute', bottom: '1.25rem', fontSize: '0.8rem', color: 'var(--color-ink-subtle)', fontStyle: 'italic' }}>
              Tap anywhere to flip card ↵
            </div>
          </div>

          {/* Card BACK */}
          <div
            className="ticket-perforated"
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              minHeight: 380,
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              padding: '2.5rem',
              backgroundColor: 'var(--color-surface)',
              borderTop: `6px solid ${organColor}`,
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <span className={`organ-badge organ-badge-${currentArticle.organ.toLowerCase()}`}>
                  Article {currentArticle.article}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--color-ink-soft)' }}>
                  Back
                </span>
              </div>
              <h3 className="font-display" style={{ fontSize: '1.4rem', color: 'var(--color-ink)', marginBottom: '1.25rem' }}>
                {currentArticle.title}
              </h3>
              <div className="ruled-lines" style={{ padding: '0.5rem 0' }}>
                <p className="font-body" style={{ fontSize: '1.25rem', lineHeight: 1.6, color: 'var(--color-ink)' }}>
                  {currentArticle.simple}
                </p>
              </div>
            </div>

            <div style={{ fontSize: '0.8rem', color: 'var(--color-ink-subtle)', textAlign: 'center', fontStyle: 'italic' }}>
              Rate your recall below
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons: Knew It vs Still Learning */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <button
          onClick={handleStillLearning}
          className="civic-btn"
          style={{
            padding: '1rem',
            borderColor: '#B3261E',
            color: '#B3261E',
            fontSize: '1rem',
          }}
        >
          ✘ Still Learning (Repeat)
        </button>
        <button
          onClick={handleKnewIt}
          className="civic-btn"
          style={{
            padding: '1rem',
            backgroundColor: '#1E6B49',
            borderColor: '#1E6B49',
            color: '#FFFFFF',
            fontSize: '1rem',
          }}
        >
          ✔ Knew It (Got It)
        </button>
      </div>
    </div>
  );
};

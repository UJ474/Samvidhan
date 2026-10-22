import React, { useState, useEffect } from 'react';
import { getRandomQuestions, getScoreSummary, type Article, type Question } from '@samvidhan/core';
import { storage } from '../services/storage.js';
import { sounds } from '../services/sound.js';
import confetti from 'canvas-confetti';

interface QuizScreenProps {
  onBack: () => void;
  onNavigateToLearnArticle?: (articleId: string) => void;
}

export const QuizScreen: React.FC<QuizScreenProps> = ({ onBack, onNavigateToLearnArticle }) => {
  const [deck, setDeck] = useState<Array<{ article: Article; question: Question }>>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState<boolean>(false);
  const [missed, setMissed] = useState<Array<{ article: Article; question: Question; chosen: number }>>([]);
  const [quizFinished, setQuizFinished] = useState<boolean>(false);

  useEffect(() => {
    // 10 random questions across all organs
    const questions = getRandomQuestions(10);
    setDeck(questions);
  }, []);

  if (deck.length === 0) {
    return <div className="container-civic" style={{ textAlign: 'center', padding: '4rem' }}>Loading questions...</div>;
  }

  const currentItem = deck[currentIndex];
  const { article, question } = currentItem;

  const handleChoose = (choiceIndex: number) => {
    if (isAnswered) return;

    setSelectedChoice(choiceIndex);
    setIsAnswered(true);

    const isCorrect = choiceIndex === question.answer;
    storage.recordAnswer(article.organ, isCorrect);

    if (isCorrect) {
      setScore((s) => s + 1);
      sounds.playCorrect();
    } else {
      sounds.playWrong();
      setMissed((prev) => [...prev, { article, question, chosen: choiceIndex }]);
    }
  };

  const handleNext = () => {
    if (currentIndex < deck.length - 1) {
      setCurrentIndex((i) => i + 1);
      setSelectedChoice(null);
      setIsAnswered(false);
      sounds.playPegTick();
    } else {
      setQuizFinished(true);
      storage.incrementMode('quiz', score);
      if (score >= 7) {
        try {
          confetti({ particleCount: 75, spread: 60, origin: { y: 0.6 } });
        } catch {}
      }
    }
  };

  // Results View
  if (quizFinished) {
    const summary = getScoreSummary(score, deck.length);
    const starStr = '★'.repeat(summary.stars) + '☆'.repeat(5 - summary.stars);
    const stampColor = summary.themeColor === 'green' ? '#1E6B49' : summary.themeColor === 'gold' ? '#B8860B' : '#B3261E';

    return (
      <div className="container-civic" style={{ maxWidth: 720 }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h2 className="font-display" style={{ fontSize: '2.4rem', color: 'var(--color-ink)' }}>
            Quiz Complete
          </h2>
          <p className="font-body" style={{ fontSize: '1.15rem', color: 'var(--color-ink-soft)' }}>
            Sansthaein Aur Samvidhan Assessment
          </p>
        </div>

        {/* Circular Stamp Mark */}
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
              PASSED • SAMVIDHAN
            </div>
            <div className="font-display" style={{ fontSize: '3.4rem', lineHeight: 1.1 }}>
              {score}/{deck.length}
            </div>
            <div style={{ fontSize: '1.4rem', color: '#B8860B', margin: '0.2rem 0' }}>
              {starStr}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 600 }}>
              {summary.pct >= 0.7 ? 'HIGH PROFICIENCY' : summary.pct >= 0.4 ? 'COMPETENT' : 'NEEDS PRACTICE'}
            </div>
          </div>
        </div>

        {/* Evaluator Message */}
        <div className="civic-card" style={{ textAlign: 'center', marginBottom: '2rem', padding: '1.5rem' }}>
          <h3 className="font-display" style={{ fontSize: '1.4rem', color: stampColor, marginBottom: '0.5rem' }}>
            {summary.message}
          </h3>
          <p style={{ fontSize: '0.95rem', color: 'var(--color-ink-soft)', margin: 0 }}>
            {missed.length === 0
              ? 'Flawless performance! You have mastered these constitutional articles.'
              : `You answered ${score} out of ${deck.length} correctly.`}
          </p>
        </div>

        {/* Missed Questions Review */}
        {missed.length > 0 && (
          <div style={{ marginBottom: '2.5rem' }}>
            <h3 className="font-display" style={{ fontSize: '1.3rem', marginBottom: '1rem', color: 'var(--color-ink)' }}>
              Review Missed Questions ({missed.length})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {missed.map((m, idx) => (
                <div key={idx} className="civic-card" style={{ padding: '1rem 1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                    <span className={`organ-badge organ-badge-${m.article.organ.toLowerCase()}`}>
                      {m.article.organ} • Article {m.article.article}
                    </span>
                    {onNavigateToLearnArticle && (
                      <button
                        onClick={() => onNavigateToLearnArticle(m.article.id)}
                        className="civic-btn"
                        style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem' }}
                      >
                        Learn Article ↗
                      </button>
                    )}
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.4rem', color: 'var(--color-ink)' }}>
                    {m.question.q}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#1E6B49', fontWeight: 600 }}>
                    ✔ Correct answer: {m.question.options[m.question.answer]}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--color-ink-soft)', fontStyle: 'italic', marginTop: '0.2rem' }}>
                    Explanation: {m.article.simple}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main Menu Action */}
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <button onClick={onBack} className="civic-btn civic-btn-primary" style={{ padding: '0.8rem 2.5rem', fontSize: '1.1rem' }}>
            Return to Main Menu
          </button>
        </div>
      </div>
    );
  }

  // Active Question Card View
  const organColor = article.organ === 'Legislature' ? '#D9731A' : article.organ === 'Judiciary' ? '#1E6B49' : '#16213A';

  return (
    <div className="container-civic" style={{ maxWidth: 720 }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <button onClick={onBack} className="civic-btn" style={{ padding: '0.4rem 0.8rem' }}>
          ✕ Quit Quiz
        </button>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', fontWeight: 600 }}>
          Question {currentIndex + 1} of {deck.length}
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.95rem', color: '#B8860B', fontWeight: 700 }}>
          ★ {score} pts
        </div>
      </div>

      {/* Progress Line */}
      <div style={{ height: 6, backgroundColor: 'rgba(22, 33, 58, 0.1)', borderRadius: 3, marginBottom: '2rem', overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: `${((currentIndex + 1) / deck.length) * 100}%`,
            backgroundColor: '#D9731A',
            transition: 'width 200ms ease',
          }}
        />
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
          <span className={`organ-badge organ-badge-${article.organ.toLowerCase()}`}>
            {article.organ}
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--color-ink-soft)' }}>
            Article {article.article}
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
            let tagChar = `[${i + 1}]`;
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
                onClick={() => handleChoose(i)}
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
                  {tagChar}
                </span>
                <span style={{ flex: 1 }}>{opt}</span>
                {statusSuffix && <span style={{ fontWeight: 800 }}>{statusSuffix}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Immediate Explanation Card */}
      {isAnswered && (
        <div
          className="civic-card"
          style={{
            padding: '1.25rem 1.5rem',
            backgroundColor: selectedChoice === question.answer ? 'rgba(30, 107, 73, 0.08)' : 'rgba(179, 38, 30, 0.08)',
            borderColor: selectedChoice === question.answer ? '#1E6B49' : '#B3261E',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            marginBottom: '1.5rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontWeight: 700, color: selectedChoice === question.answer ? '#1E6B49' : '#B3261E' }}>
              {selectedChoice === question.answer ? '✔ Correct!' : '✘ Not quite!'}
            </span>
            <span style={{ fontSize: '0.85rem', color: 'var(--color-ink-soft)' }}>
              ({article.title})
            </span>
          </div>
          <p className="font-body" style={{ fontSize: '1.1rem', margin: 0, color: 'var(--color-ink)' }}>
            {article.simple}
          </p>
        </div>
      )}

      {/* Continue Button */}
      {isAnswered && (
        <div style={{ textAlign: 'right' }}>
          <button onClick={handleNext} className="civic-btn civic-btn-primary" style={{ padding: '0.75rem 2rem', fontSize: '1.05rem' }}>
            {currentIndex < deck.length - 1 ? 'Next Question →' : 'View Results ★'}
          </button>
        </div>
      )}
    </div>
  );
};

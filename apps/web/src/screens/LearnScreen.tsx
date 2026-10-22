import React, { useState } from 'react';
import { getArticlesByOrgan, ORGANS, type Organ, type Article } from '@samvidhan/core';
import { storage } from '../services/storage.js';
import { sounds } from '../services/sound.js';

interface LearnScreenProps {
  onBack: () => void;
  initialOrgan?: Organ;
  initialArticleId?: string;
}

export const LearnScreen: React.FC<LearnScreenProps> = ({ onBack, initialOrgan, initialArticleId }) => {
  const [selectedOrgan, setSelectedOrgan] = useState<Organ | null>(initialOrgan || null);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [bookmarks, setBookmarks] = useState<string[]>(() => storage.getBookmarks());

  const articles = selectedOrgan ? getArticlesByOrgan(selectedOrgan) : [];
  const currentArticle: Article | undefined = articles[currentIndex];

  const handleSelectOrgan = (organ: Organ) => {
    setSelectedOrgan(organ);
    setCurrentIndex(0);
    sounds.playPegTick();
  };

  const handleToggleBookmark = (articleId: string) => {
    storage.toggleBookmark(articleId);
    setBookmarks(storage.getBookmarks());
    sounds.playPegTick();
  };

  const handleNext = () => {
    if (currentIndex < articles.length - 1) {
      setCurrentIndex((i) => i + 1);
      sounds.playPegTick();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
      sounds.playPegTick();
    }
  };

  // View 1: Organ Picker
  if (!selectedOrgan || !currentArticle) {
    return (
      <div className="container-civic" style={{ maxWidth: 760 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
          <button onClick={onBack} className="civic-btn" style={{ padding: '0.4rem 0.8rem' }}>
            ← Main Menu
          </button>
          <h2 className="font-display" style={{ fontSize: '1.8rem', margin: 0 }}>
            Learn Mode
          </h2>
          <div style={{ width: 80 }} />
        </div>

        <p className="font-body" style={{ fontSize: '1.15rem', color: 'var(--color-ink-soft)', marginBottom: '1.5rem', textAlign: 'center' }}>
          Select an organ of the State to explore its constitutional foundation and mandates:
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
          {ORGANS.map((organ, i) => {
            const count = getArticlesByOrgan(organ).length;
            const color = organ === 'Legislature' ? '#D9731A' : organ === 'Executive' ? '#16213A' : '#1E6B49';
            return (
              <div
                key={organ}
                className="civic-card civic-card-interactive"
                onClick={() => handleSelectOrgan(organ)}
                style={{
                  padding: '2rem 1.5rem',
                  textAlign: 'center',
                  borderTop: `6px solid ${color}`,
                }}
              >
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--color-ink-soft)', marginBottom: '0.5rem' }}>
                  BRANCH [{i + 1}]
                </div>
                <h3 className="font-display" style={{ fontSize: '1.6rem', marginBottom: '0.5rem', color: 'var(--color-ink)' }}>
                  {organ}
                </h3>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', color: color, fontWeight: 600 }}>
                  {count} Articles
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-ink-soft)', marginTop: '0.75rem' }}>
                  {organ === 'Legislature'
                    ? 'Parliament & State Assemblies'
                    : organ === 'Executive'
                    ? 'President, PM, Governor & Ministers'
                    : 'Supreme Court & High Courts'}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const isBookmarked = bookmarks.includes(currentArticle.id);
  const organColor = currentArticle.organ === 'Legislature' ? '#D9731A' : currentArticle.organ === 'Judiciary' ? '#1E6B49' : '#16213A';

  // View 2: Article Deck Card
  return (
    <div className="container-civic" style={{ maxWidth: 760 }}>
      {/* Top Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <button onClick={() => setSelectedOrgan(null)} className="civic-btn" style={{ padding: '0.4rem 0.8rem' }}>
          ← Choose Organ
        </button>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', fontWeight: 600 }}>
          {selectedOrgan} • {currentIndex + 1} of {articles.length}
        </div>
        <button
          onClick={() => handleToggleBookmark(currentArticle.id)}
          className="civic-btn"
          style={{
            padding: '0.4rem 0.8rem',
            backgroundColor: isBookmarked ? '#B8860B' : 'var(--color-surface)',
            color: isBookmarked ? '#FFFFFF' : 'var(--color-ink)',
          }}
        >
          {isBookmarked ? '★ Bookmarked' : '☆ Bookmark'}
        </button>
      </div>

      {/* Progress Bar */}
      <div style={{ height: 6, backgroundColor: 'rgba(22, 33, 58, 0.1)', borderRadius: 3, marginBottom: '2rem', overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: `${((currentIndex + 1) / articles.length) * 100}%`,
            backgroundColor: organColor,
            transition: 'width 200ms ease',
          }}
        />
      </div>

      {/* Ledger Article Card */}
      <div
        className="civic-card"
        style={{
          padding: '2.5rem 2rem',
          minHeight: 380,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          borderLeft: `8px solid ${organColor}`,
        }}
      >
        <div>
          {/* Header Metadata */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <span className={`organ-badge organ-badge-${currentArticle.organ.toLowerCase()}`}>
              {currentArticle.organ}
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', color: 'var(--color-ink-soft)' }}>
              CONSTITUTION PART {currentArticle.part}
            </span>
          </div>

          {/* Large Ledger Numeral & Title */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div className="font-display" style={{ fontSize: '3rem', lineHeight: 1.1, color: organColor }}>
              Article {currentArticle.article}
            </div>
            <h2 className="font-display" style={{ fontSize: '1.6rem', marginTop: '0.5rem', color: 'var(--color-ink)' }}>
              {currentArticle.title}
            </h2>
          </div>

          {/* Plain Language Explanation on Ruled Lines */}
          <div className="ruled-lines" style={{ padding: '0.5rem 0' }}>
            <p className="font-body" style={{ fontSize: '1.35rem', color: 'var(--color-ink)' }}>
              {currentArticle.simple}
            </p>
          </div>
        </div>

        {/* Card Footnote */}
        <div
          style={{
            marginTop: '2rem',
            paddingTop: '1rem',
            borderTop: '1px dashed var(--color-ink-soft)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.85rem',
            color: 'var(--color-ink-soft)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          <span>{currentArticle.questions.length} questions available in Quiz &amp; Wheel</span>
          <span>Tab #{currentIndex + 1}</span>
        </div>
      </div>

      {/* Stepper Buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem' }}>
        <button
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="civic-btn"
          style={{ opacity: currentIndex === 0 ? 0.4 : 1, width: 140 }}
        >
          ← Previous
        </button>
        <button
          onClick={handleNext}
          disabled={currentIndex === articles.length - 1}
          className="civic-btn civic-btn-primary"
          style={{ opacity: currentIndex === articles.length - 1 ? 0.4 : 1, width: 140 }}
        >
          Next →
        </button>
      </div>
    </div>
  );
};

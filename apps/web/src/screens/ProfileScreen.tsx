import React, { useState } from 'react';
import { getArticleById, ORGANS, type Article } from '@samvidhan/core';
import { storage } from '../services/storage.js';
import { sounds } from '../services/sound.js';

interface ProfileScreenProps {
  onBack: () => void;
  onNavigateToArticle: (articleId: string) => void;
  onToggleTheme: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ onBack, onNavigateToArticle, onToggleTheme }) => {
  const [stats] = useState(() => storage.getStats());
  const [bookmarks, setBookmarks] = useState(() => storage.getBookmarks());
  const [settings, setSettings] = useState(() => storage.getSettings());

  const handleToggleSound = () => {
    const updated = storage.updateSettings({ sound: !settings.sound });
    sounds.enabled = updated.sound;
    setSettings(updated);
  };

  const handleToggleHaptics = () => {
    const updated = storage.updateSettings({ haptics: !settings.haptics });
    sounds.hapticsEnabled = updated.haptics;
    setSettings(updated);
  };

  const handleRemoveBookmark = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    storage.toggleBookmark(id);
    setBookmarks(storage.getBookmarks());
    sounds.playPegTick();
  };

  const accuracyPct = stats.totalAnswered > 0 ? Math.round((stats.totalCorrect / stats.totalAnswered) * 100) : 0;

  return (
    <div className="container-civic" style={{ maxWidth: 760 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <button onClick={onBack} className="civic-btn" style={{ padding: '0.4rem 0.8rem' }}>
          ← Main Menu
        </button>
        <h2 className="font-display" style={{ fontSize: '1.8rem', margin: 0 }}>
          Profile &amp; Ledgers
        </h2>
        <div style={{ width: 80 }} />
      </div>

      {/* Primary Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="civic-card" style={{ textAlign: 'center', padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: 'var(--color-ink-soft)' }}>
            STREAK
          </div>
          <div className="font-display" style={{ fontSize: '2.4rem', color: '#D9731A', margin: '0.25rem 0' }}>
            {stats.streakDays}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-ink-soft)' }}>Consecutive Days</div>
        </div>

        <div className="civic-card" style={{ textAlign: 'center', padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: 'var(--color-ink-soft)' }}>
            ACCURACY
          </div>
          <div className="font-display" style={{ fontSize: '2.4rem', color: '#1E6B49', margin: '0.25rem 0' }}>
            {accuracyPct}%
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-ink-soft)' }}>
            {stats.totalCorrect} of {stats.totalAnswered} Correct
          </div>
        </div>

        <div className="civic-card" style={{ textAlign: 'center', padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: 'var(--color-ink-soft)' }}>
            GAMES PLAYED
          </div>
          <div className="font-display" style={{ fontSize: '2.4rem', color: '#243B8C', margin: '0.25rem 0' }}>
            {stats.gamesPlayed}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-ink-soft)' }}>All Solo Modes</div>
        </div>

        <div className="civic-card" style={{ textAlign: 'center', padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: 'var(--color-ink-soft)' }}>
            BEST SCORE
          </div>
          <div className="font-display" style={{ fontSize: '2.4rem', color: '#B8860B', margin: '0.25rem 0' }}>
            {stats.bestScore}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-ink-soft)' }}>High Record</div>
        </div>
      </div>

      {/* Accuracy By Organ */}
      <div className="civic-card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <h3 className="font-display" style={{ fontSize: '1.25rem', marginBottom: '1.25rem' }}>
          Accuracy by Institution
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {ORGANS.map((organ) => {
            const data = stats.accuracyByOrgan[organ] || { correct: 0, total: 0 };
            const pct = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0;
            const barColor = organ === 'Legislature' ? '#D9731A' : organ === 'Executive' ? '#16213A' : '#1E6B49';

            return (
              <div key={organ}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', fontSize: '0.9rem' }}>
                  <span style={{ fontWeight: 600 }}>{organ}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-ink-soft)' }}>
                    {pct}% ({data.correct}/{data.total})
                  </span>
                </div>
                <div style={{ height: 8, backgroundColor: 'rgba(22, 33, 58, 0.1)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, backgroundColor: barColor, transition: 'width 200ms ease' }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bookmarked Articles */}
      <div className="civic-card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <h3 className="font-display" style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>
          Bookmarked Articles ({bookmarks.length})
        </h3>
        {bookmarks.length === 0 ? (
          <p style={{ color: 'var(--color-ink-soft)', fontSize: '0.95rem', fontStyle: 'italic', margin: 0 }}>
            No bookmarked articles yet. Tap the bookmark button in Learn mode to save articles here.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {bookmarks.map((id) => {
              const art = getArticleById(id);
              if (!art) return null;
              return (
                <div
                  key={id}
                  onClick={() => onNavigateToArticle(art.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    border: '1.5px solid var(--color-ink)',
                    borderRadius: 4,
                    cursor: 'pointer',
                    backgroundColor: 'var(--color-surface)',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span className={`organ-badge organ-badge-${art.organ.toLowerCase()}`}>
                        {art.organ}
                      </span>
                      <span className="font-display" style={{ fontSize: '1.1rem' }}>
                        Article {art.article}: {art.title}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleRemoveBookmark(art.id, e)}
                    className="civic-btn"
                    style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                  >
                    Remove
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Preferences & Settings */}
      <div className="civic-card" style={{ padding: '1.5rem', marginBottom: '3rem' }}>
        <h3 className="font-display" style={{ fontSize: '1.25rem', marginBottom: '1.25rem' }}>
          Preferences &amp; Civic Styling
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 600 }}>Mechanical Sound Effects</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-ink-soft)' }}>
                Peg ticks, dice rattle, and answer chimes
              </div>
            </div>
            <button onClick={handleToggleSound} className="civic-btn" style={{ padding: '0.4rem 1rem' }}>
              {settings.sound ? 'Enabled ✔' : 'Muted ✘'}
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 600 }}>Haptic Vibrations</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-ink-soft)' }}>
                Tactile feedback on mobile and supported devices
              </div>
            </div>
            <button onClick={handleToggleHaptics} className="civic-btn" style={{ padding: '0.4rem 1rem' }}>
              {settings.haptics ? 'Enabled ✔' : 'Off ✘'}
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 600 }}>Theme Mode</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-ink-soft)' }}>
                Paper (Printed Parchment) or Night (Sleek Dark)
              </div>
            </div>
            <button onClick={onToggleTheme} className="civic-btn" style={{ padding: '0.4rem 1rem' }}>
              Toggle Theme 🌓
            </button>
          </div>

          <div style={{ borderTop: '1px dashed var(--color-ink-soft)', paddingTop: '1rem', marginTop: '0.5rem' }}>
            <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Multiplayer Server URL</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-ink-soft)', marginBottom: '0.5rem' }}>
              Used when joining or hosting live classroom games
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                defaultValue={localStorage.getItem('samvidhan_server_url') || 'http://localhost:3001'}
                placeholder="http://localhost:3001 or https://your-server.onrender.com"
                id="server-url-input"
                style={{
                  flex: 1,
                  padding: '0.5rem 0.75rem',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.85rem',
                  border: '1.5px solid var(--color-ink)',
                  borderRadius: 4,
                  backgroundColor: 'var(--color-bg)',
                  color: 'var(--color-ink)',
                }}
              />
              <button
                type="button"
                onClick={() => {
                  const val = (document.getElementById('server-url-input') as HTMLInputElement)?.value.trim();
                  if (val) {
                    localStorage.setItem('samvidhan_server_url', val);
                    window.location.reload();
                  }
                }}
                className="civic-btn"
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

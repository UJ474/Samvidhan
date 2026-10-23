import React, { useState } from 'react';
import { getArticleById, ORGANS } from '@samvidhan/core';
import { storage } from '../services/storage.js';
import { sounds } from '../services/sound.js';
import { getServerUrl, setServerUrl } from '../services/socket.js';

interface ProfileScreenProps {
  onBack: () => void;
  onNavigateToArticle: (articleId: string) => void;
  onToggleTheme: () => void;
  initialTab?: 'profile' | 'settings';
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  onBack,
  onNavigateToArticle,
  onToggleTheme,
  initialTab = 'profile',
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'settings'>(initialTab);
  const [stats, setStats] = useState(() => storage.getStats());
  const [bookmarks, setBookmarks] = useState(() => storage.getBookmarks());
  const [settings, setSettings] = useState(() => storage.getSettings());
  const [serverInput, setServerInput] = useState(() => getServerUrl());
  const [serverSaveMsg, setServerSaveMsg] = useState<string>('');
  const [pingStatus, setPingStatus] = useState<'idle' | 'checking' | 'online' | 'offline'>('idle');

  const handleToggleSound = () => {
    const updated = storage.updateSettings({ sound: !settings.sound });
    sounds.enabled = updated.sound;
    setSettings(updated);
    if (updated.sound) {
      sounds.playCorrect();
    }
  };

  const handleToggleHaptics = () => {
    const updated = storage.updateSettings({ haptics: !settings.haptics });
    sounds.hapticsEnabled = updated.haptics;
    setSettings(updated);
    sounds.playPegTick();
  };

  const handleRemoveBookmark = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    storage.toggleBookmark(id);
    setBookmarks(storage.getBookmarks());
    sounds.playPegTick();
  };

  const handleSaveServer = (urlToSave?: string) => {
    const target = (urlToSave || serverInput).trim();
    if (!target) return;
    setServerUrl(target);
    setServerInput(target);
    setServerSaveMsg('Server URL saved! Reconnecting...');
    sounds.playCorrect();
    setTimeout(() => {
      setServerSaveMsg('');
    }, 3000);
  };

  const handleTestServerPing = async () => {
    setPingStatus('checking');
    try {
      const url = serverInput.trim().replace(/\/$/, '');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(`${url}/health`, { signal: controller.signal }).catch(() => null);
      clearTimeout(timeoutId);

      if (res && (res.ok || res.status === 200 || res.status === 404)) {
        setPingStatus('online');
        sounds.playCorrect();
      } else {
        setPingStatus('offline');
        sounds.playWrong();
      }
    } catch {
      setPingStatus('offline');
      sounds.playWrong();
    }
  };

  const handleResetStats = () => {
    if (window.confirm('Are you sure you want to reset your quiz stats and streak? This cannot be undone.')) {
      localStorage.removeItem('samvidhan_stats_v1');
      setStats(storage.getStats());
      sounds.playWrong();
    }
  };

  const accuracyPct = stats.totalAnswered > 0 ? Math.round((stats.totalCorrect / stats.totalAnswered) * 100) : 0;

  return (
    <div className="container-civic" style={{ maxWidth: 780 }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <button onClick={onBack} className="civic-btn" style={{ padding: '0.4rem 0.8rem' }}>
          ← Main Menu
        </button>
        <h2 className="font-display" style={{ fontSize: '1.8rem', margin: 0 }}>
          {activeTab === 'profile' ? 'Learner Profile & Stats' : 'System & Server Settings'}
        </h2>
        <div style={{ width: 80 }} />
      </div>

      {/* Segmented Tab Navigation: Eliminates Any Redundancy */}
      <div
        style={{
          display: 'flex',
          border: '2px solid var(--color-ink)',
          borderRadius: 6,
          overflow: 'hidden',
          marginBottom: '2rem',
          backgroundColor: 'var(--color-surface)',
          boxShadow: 'var(--shadow-ink)',
        }}
      >
        <button
          onClick={() => {
            setActiveTab('profile');
            sounds.playPegTick();
          }}
          style={{
            flex: 1,
            padding: '0.75rem 1rem',
            backgroundColor: activeTab === 'profile' ? 'var(--color-ink)' : 'transparent',
            color: activeTab === 'profile' ? '#FFFFFF' : 'var(--color-ink)',
            fontWeight: 700,
            fontSize: '0.95rem',
            fontFamily: 'var(--font-mono)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            transition: 'background-color 150ms ease',
          }}
        >
          <span>👤</span> Profile &amp; Stats
        </button>

        <button
          onClick={() => {
            setActiveTab('settings');
            sounds.playPegTick();
          }}
          style={{
            flex: 1,
            padding: '0.75rem 1rem',
            backgroundColor: activeTab === 'settings' ? 'var(--color-ink)' : 'transparent',
            color: activeTab === 'settings' ? '#FFFFFF' : 'var(--color-ink)',
            fontWeight: 700,
            fontSize: '0.95rem',
            fontFamily: 'var(--font-mono)',
            border: 'none',
            borderLeft: '2px solid var(--color-ink)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            transition: 'background-color 150ms ease',
          }}
        >
          <span>⚙️</span> Settings &amp; Server
        </button>
      </div>

      {/* =========================================================================
          TAB 1: PROFILE & STATS (NO SETTINGS OR SERVER REDUNDANCY)
         ========================================================================= */}
      {activeTab === 'profile' && (
        <>
          {/* Primary Stats Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: '1rem',
              marginBottom: '2rem',
            }}
          >
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
              <div style={{ fontSize: '0.8rem', color: 'var(--color-ink-soft)' }}>Across Solo Modes</div>
            </div>

            <div className="civic-card" style={{ textAlign: 'center', padding: '1.25rem' }}>
              <div style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: 'var(--color-ink-soft)' }}>
                BEST SCORE
              </div>
              <div className="font-display" style={{ fontSize: '2.4rem', color: '#B8860B', margin: '0.25rem 0' }}>
                {stats.bestScore}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-ink-soft)' }}>Points High Record</div>
            </div>
          </div>

          {/* Accuracy By Organ */}
          <div className="civic-card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
            <h3 className="font-display" style={{ fontSize: '1.25rem', marginBottom: '1.25rem' }}>
              Constitutional Accuracy by Institution
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {ORGANS.map((organ) => {
                const data = stats.accuracyByOrgan[organ] || { correct: 0, total: 0 };
                const pct = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0;
                const barColor = organ === 'Legislature' ? '#D9731A' : organ === 'Executive' ? '#16213A' : '#1E6B49';

                return (
                  <div key={organ}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: '0.35rem',
                        fontSize: '0.9rem',
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>{organ}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-ink-soft)' }}>
                        {pct}% ({data.correct}/{data.total} correct)
                      </span>
                    </div>
                    <div
                      style={{
                        height: 10,
                        backgroundColor: 'rgba(22, 33, 58, 0.1)',
                        borderRadius: 5,
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${pct}%`,
                          backgroundColor: barColor,
                          transition: 'width 250ms ease',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bookmarked Articles */}
          <div className="civic-card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 className="font-display" style={{ fontSize: '1.25rem', margin: 0 }}>
                Bookmarked Articles ({bookmarks.length})
              </h3>
              {bookmarks.length > 0 && (
                <span style={{ fontSize: '0.8rem', color: 'var(--color-ink-soft)', fontFamily: 'var(--font-mono)' }}>
                  Tap an article to review in Learn mode
                </span>
              )}
            </div>

            {bookmarks.length === 0 ? (
              <p style={{ color: 'var(--color-ink-soft)', fontSize: '0.95rem', fontStyle: 'italic', margin: 0 }}>
                No bookmarked articles yet. Tap the bookmark icon in <strong>[1] Learn</strong> mode to save articles here for quick review.
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span className={`organ-badge organ-badge-${art.organ.toLowerCase()}`}>
                          {art.organ}
                        </span>
                        <span className="font-display" style={{ fontSize: '1.1rem' }}>
                          Article {art.article}: {art.title}
                        </span>
                      </div>
                      <button
                        onClick={(e) => handleRemoveBookmark(art.id, e)}
                        className="civic-btn"
                        style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem' }}
                        title="Remove bookmark"
                      >
                        Remove ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Reset Stats Action */}
          <div style={{ textAlign: 'right', marginBottom: '2rem' }}>
            <button
              onClick={handleResetStats}
              style={{
                background: 'none',
                border: 'none',
                color: '#B3261E',
                fontSize: '0.8rem',
                cursor: 'pointer',
                fontFamily: 'var(--font-mono)',
                textDecoration: 'underline',
              }}
            >
              Reset Quiz Stats &amp; Streak
            </button>
          </div>
        </>
      )}

      {/* =========================================================================
          TAB 2: SETTINGS & SERVER (NO STATS REDUNDANCY)
         ========================================================================= */}
      {activeTab === 'settings' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '3rem' }}>
          {/* Multiplayer Server URL Configuration Card */}
          <div className="civic-card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
              <h3 className="font-display" style={{ fontSize: '1.3rem', margin: 0 }}>
                Multiplayer Server Connection
              </h3>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.75rem',
                  padding: '0.2rem 0.5rem',
                  borderRadius: 4,
                  backgroundColor:
                    pingStatus === 'online'
                      ? '#EBF6F0'
                      : pingStatus === 'offline'
                      ? '#FDE8E8'
                      : 'rgba(22, 33, 58, 0.08)',
                  color:
                    pingStatus === 'online'
                      ? '#1E6B49'
                      : pingStatus === 'offline'
                      ? '#B3261E'
                      : 'var(--color-ink)',
                  fontWeight: 700,
                }}
              >
                {pingStatus === 'idle' && 'Status: Unchecked'}
                {pingStatus === 'checking' && 'Pinging Server...'}
                {pingStatus === 'online' && '🟢 Server Reachable'}
                {pingStatus === 'offline' && '🔴 Cannot Reach Server'}
              </span>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--color-ink-soft)', margin: '0 0 1rem' }}>
              The WebSocket and HTTP backend URL used for live Host and Join quiz sessions.
            </p>

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <input
                type="text"
                value={serverInput}
                onChange={(e) => setServerInput(e.target.value)}
                placeholder="https://samvidhan-rwdv.onrender.com"
                style={{
                  flex: 1,
                  padding: '0.6rem 0.8rem',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.9rem',
                  border: '1.5px solid var(--color-ink)',
                  borderRadius: 4,
                  backgroundColor: 'var(--color-bg)',
                  color: 'var(--color-ink)',
                }}
              />
              <button
                type="button"
                onClick={() => handleSaveServer()}
                className="civic-btn civic-btn-primary"
                style={{ padding: '0.6rem 1.25rem', fontSize: '0.85rem' }}
              >
                Save
              </button>
              <button
                type="button"
                onClick={handleTestServerPing}
                className="civic-btn"
                style={{ padding: '0.6rem 0.9rem', fontSize: '0.85rem' }}
                title="Test HTTP Reachability"
              >
                Test Ping ⚡
              </button>
            </div>

            {/* Quick Presets */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--color-ink-soft)' }}>
                Quick Presets:
              </span>
              <button
                type="button"
                onClick={() => {
                  const url = 'https://samvidhan-rwdv.onrender.com';
                  setServerInput(url);
                  handleSaveServer(url);
                }}
                className="civic-btn"
                style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem' }}
              >
                ☁️ Render Cloud (samvidhan-rwdv.onrender.com)
              </button>
              <button
                type="button"
                onClick={() => {
                  const url = 'http://localhost:3001';
                  setServerInput(url);
                  handleSaveServer(url);
                }}
                className="civic-btn"
                style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem' }}
              >
                💻 Local Dev (localhost:3001)
              </button>
            </div>

            {serverSaveMsg && (
              <div
                style={{
                  marginTop: '0.75rem',
                  padding: '0.4rem 0.75rem',
                  backgroundColor: '#EBF6F0',
                  color: '#1E6B49',
                  borderRadius: 4,
                  fontSize: '0.85rem',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 600,
                }}
              >
                ✔ {serverSaveMsg}
              </div>
            )}
          </div>

          {/* Audio & Haptic Feedback Card */}
          <div className="civic-card" style={{ padding: '1.5rem' }}>
            <h3 className="font-display" style={{ fontSize: '1.3rem', marginBottom: '1.25rem' }}>
              Audio &amp; Physical Feedback
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>Mechanical Sound Effects</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--color-ink-soft)' }}>
                    Physical peg clicks, wheel ticks, dice rattle, and answer chimes
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={handleToggleSound} className="civic-btn" style={{ padding: '0.4rem 1rem' }}>
                    {settings.sound ? 'Enabled ✔' : 'Muted ✘'}
                  </button>
                  {settings.sound && (
                    <button
                      onClick={() => sounds.playCorrect()}
                      className="civic-btn"
                      style={{ padding: '0.4rem 0.7rem', fontSize: '0.8rem' }}
                      title="Play sample chime"
                    >
                      🔔 Test
                    </button>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>Haptic Vibrations</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--color-ink-soft)' }}>
                    Tactile pulses on mobile devices when spinning or answering
                  </div>
                </div>
                <button onClick={handleToggleHaptics} className="civic-btn" style={{ padding: '0.4rem 1rem' }}>
                  {settings.haptics ? 'Enabled ✔' : 'Off ✘'}
                </button>
              </div>
            </div>
          </div>

          {/* Appearance & Civic Styling Card */}
          <div className="civic-card" style={{ padding: '1.5rem' }}>
            <h3 className="font-display" style={{ fontSize: '1.3rem', marginBottom: '1.25rem' }}>
              Appearance &amp; Theme
            </h3>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600 }}>Color Theme</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-ink-soft)' }}>
                  Switch between Paper (Printed Parchment) and Night (Sleek Dark Mode)
                </div>
              </div>
              <button
                onClick={() => {
                  onToggleTheme();
                  sounds.playPegTick();
                }}
                className="civic-btn"
                style={{ padding: '0.45rem 1.1rem', fontWeight: 600 }}
              >
                Toggle Theme 🌓
              </button>
            </div>
          </div>

          {/* About / Version Badge */}
          <div
            style={{
              padding: '1rem',
              textAlign: 'center',
              color: 'var(--color-ink-soft)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.8rem',
            }}
          >
            SAMVIDHAN v1.0.0 • CONSTITUTION OF INDIA (PARTS V &amp; VI)
          </div>
        </div>
      )}
    </div>
  );
};

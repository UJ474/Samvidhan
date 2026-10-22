import React, { useState } from 'react';
import { Chakra } from '../components/Chakra.js';
import { storage } from '../services/storage.js';
import { getServerUrl } from '../services/socket.js';

interface HomeScreenProps {
  onSelectScreen: (screen: string) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onSelectScreen }) => {
  const stats = storage.getStats();
  const [serverUrl] = useState(() => getServerUrl());

  const modes = [
    {
      id: 'learn',
      num: '[1]',
      title: 'Learn',
      subtitle: 'Simple article cards',
      desc: 'Explore the 26 articles across Legislature, Executive & Judiciary with plain-language explanations.',
      color: '#D9731A',
    },
    {
      id: 'quiz',
      num: '[2]',
      title: 'Quiz',
      subtitle: '10 quick questions',
      desc: 'Test your knowledge across all branches with immediate explanations and star ratings.',
      color: '#1E6B49',
    },
    {
      id: 'wheel',
      num: '[3]',
      title: 'Spin the Wheel',
      subtitle: 'Land on an organ, then answer',
      desc: '5 rounds with the physical animated wheel. Land on an institution to challenge yourself.',
      color: '#243B8C',
    },
    {
      id: 'flash',
      num: '[4]',
      title: 'Flash Cards',
      subtitle: 'Flip cards, test your memory',
      desc: 'Ticket-stub cards with 3D physical flip. Cycle between Knew it and Still learning.',
      color: '#B8860B',
    },
    {
      id: 'snakes',
      num: '[5]',
      title: 'Snakes & Ladders',
      subtitle: '2 players, answer to climb',
      desc: 'Classic 30-square board game. Answer constitutional questions to climb ladders or escape snakes.',
      color: '#D9731A',
    },
  ];

  return (
    <div className="container-civic" style={{ maxWidth: 840 }}>
      {/* Top Universal Bar: Quick access to Profile and Server Settings */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0.75rem 0',
          marginBottom: '0.75rem',
          borderBottom: '1px solid rgba(0,0,0,0.1)',
          flexWrap: 'wrap',
          gap: '0.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--color-ink-soft)', fontWeight: 700 }}>
            BACKEND:
          </span>
          <button
            onClick={() => onSelectScreen('profile')}
            style={{
              fontSize: '0.75rem',
              fontFamily: 'var(--font-mono)',
              padding: '0.2rem 0.6rem',
              backgroundColor: 'var(--color-surface)',
              border: '1.5px solid var(--color-ink)',
              borderRadius: 4,
              cursor: 'pointer',
              color: '#243B8C',
              fontWeight: 600,
            }}
            title="Click to view or change Server URL"
          >
            {serverUrl} ✏️
          </button>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => onSelectScreen('profile')}
            className="civic-btn"
            style={{ padding: '0.35rem 0.85rem', fontSize: '0.85rem', fontWeight: 600 }}
          >
            👤 Profile &amp; Stats
          </button>
          <button
            onClick={() => onSelectScreen('profile')}
            className="civic-btn"
            style={{ padding: '0.35rem 0.85rem', fontSize: '0.85rem' }}
          >
            ⚙️ Server Settings
          </button>
        </div>
      </div>

      {/* Header Banner */}
      <header
        style={{
          textAlign: 'center',
          padding: '1.5rem 1rem 1.5rem',
          borderBottom: '2px dashed var(--color-ink)',
          marginBottom: '2rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>

          <Chakra size={44} spinning />
          <h1 className="font-display" style={{ fontSize: '2.5rem', letterSpacing: '0.05em', color: 'var(--color-ink)' }}>
            SAMVIDHAN
          </h1>
          <Chakra size={44} spinning />
        </div>
        <p className="font-body" style={{ fontSize: '1.25rem', fontStyle: 'italic', color: 'var(--color-ink-soft)' }}>
          Sansthaein Aur Samvidhan — Parts V &amp; VI of the Constitution of India
        </p>

        {/* Streak & Stats Bar */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '1.5rem',
            marginTop: '1.25rem',
            padding: '0.4rem 1.25rem',
            backgroundColor: 'var(--color-surface)',
            border: '2px solid var(--color-ink)',
            borderRadius: 20,
            boxShadow: 'var(--shadow-ink)',
            fontSize: '0.85rem',
            fontFamily: 'var(--font-mono)',
          }}
        >
          <span>🔥 {stats.streakDays} Day Streak</span>
          <span>•</span>
          <span>★ Best: {stats.bestScore} pts</span>
          <span>•</span>
          <span>🎮 {stats.gamesPlayed} Games</span>
        </div>
      </header>

      {/* Multiplayer Live Action Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem',
        }}
      >
        <div
          className="civic-card civic-card-interactive"
          onClick={() => onSelectScreen('join')}
          style={{
            backgroundColor: '#FBF7EE',
            border: '2px solid #243B8C',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1.25rem',
          }}
        >
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#243B8C', fontWeight: 700 }}>
              LIVE MULTIPLAYER
            </div>
            <div className="font-display" style={{ fontSize: '1.4rem', color: '#16213A' }}>
              Join a Game
            </div>
            <div style={{ fontSize: '0.85rem', color: '#4A5470' }}>
              Enter a 6-character room code to play with others
            </div>
          </div>
          <button className="civic-btn civic-btn-chakra">Enter Code →</button>
        </div>

        <div
          className="civic-card civic-card-interactive"
          onClick={() => onSelectScreen('host')}
          style={{
            backgroundColor: '#FBF7EE',
            border: '2px solid #D9731A',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1.25rem',
          }}
        >
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#D9731A', fontWeight: 700 }}>
              CLASSROOM &amp; STAGE
            </div>
            <div className="font-display" style={{ fontSize: '1.4rem', color: '#16213A' }}>
              Host a Game
            </div>
            <div style={{ fontSize: '0.85rem', color: '#4A5470' }}>
              Create a quiz, project the big screen, drive rounds
            </div>
          </div>
          <button className="civic-btn civic-btn-primary">Host Room →</button>
        </div>
      </div>

      {/* Solo Modes Heading */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 className="font-display" style={{ fontSize: '1.5rem', color: 'var(--color-ink)' }}>
          Solo Play (Offline)
        </h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => onSelectScreen('profile')} className="civic-btn" style={{ fontSize: '0.85rem' }}>
            📜 Profile &amp; Bookmarks
          </button>
        </div>
      </div>

      {/* Mode Cards Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '3rem' }}>
        {modes.map((m) => (
          <div
            key={m.id}
            className="civic-card civic-card-interactive"
            onClick={() => onSelectScreen(m.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1.25rem 1.5rem',
              borderLeft: `6px solid ${m.color}`,
            }}
          >
            <div style={{ maxWidth: '80%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: m.color }}>
                  {m.num}
                </span>
                <span className="font-display" style={{ fontSize: '1.3rem', color: 'var(--color-ink)' }}>
                  {m.title}
                </span>
                <span style={{ fontSize: '0.85rem', color: 'var(--color-ink-soft)', fontStyle: 'italic' }}>
                  — {m.subtitle}
                </span>
              </div>
              <p style={{ fontSize: '0.9rem', color: 'var(--color-ink-soft)', margin: 0 }}>
                {m.desc}
              </p>
            </div>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.2rem', color: 'var(--color-ink)' }}>
              ❯
            </span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <footer
        style={{
          textAlign: 'center',
          padding: '1.5rem',
          borderTop: '2px dashed var(--color-ink)',
          color: 'var(--color-ink-soft)',
          fontSize: '0.9rem',
          fontFamily: 'var(--font-mono)',
        }}
      >
        <p>CONSTITUTION OF INDIA • UNION &amp; STATES</p>
        <p style={{ marginTop: '0.25rem' }}>Jai Hind</p>
      </footer>
    </div>
  );
};

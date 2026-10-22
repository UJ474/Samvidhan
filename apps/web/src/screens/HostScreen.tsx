import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { getSocket, getServerUrl, setServerUrl } from '../services/socket.js';
import {
  SOCKET_EVENTS,
  type QuizSchema,
  type RoomCreatedPayload,
  type LobbyUpdatePayload,
  type ClientQuestionPayload,
  type QuestionRevealPayload,
  type LeaderboardUpdatePayload,
  type GameFinishedPayload,
  type WheelSpinPayload,
} from '@samvidhan/protocol';
import { getAllArticles, getAllQuestions, type Quiz } from '@samvidhan/core';
import { SpinningWheel } from '../components/SpinningWheel.js';
import { Chakra } from '../components/Chakra.js';
import { sounds } from '../services/sound.js';
import confetti from 'canvas-confetti';

interface HostScreenProps {
  onBack: () => void;
  isProjectorMode?: boolean;
}

export const HostScreen: React.FC<HostScreenProps> = ({ onBack, isProjectorMode = false }) => {
  const [phase, setPhase] = useState<'BUILDER' | 'LOBBY' | 'WHEEL' | 'QUESTION' | 'REVEAL' | 'LEADERBOARD' | 'FINISHED'>('BUILDER');
  const [mode, setMode] = useState<'quiz' | 'wheel'>('quiz');
  const [quizTitle, setQuizTitle] = useState<string>('Constitution Classroom Challenge');
  const [secondsPerQuestion, setSecondsPerQuestion] = useState<number>(20);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [serverUrl, setServerUrlState] = useState<string>(() => getServerUrl());

  // Host Session State
  const [roomCreated, setRoomCreated] = useState<RoomCreatedPayload | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [lobbyData, setLobbyData] = useState<LobbyUpdatePayload | null>(null);
  const [wheelSpin, setWheelSpin] = useState<WheelSpinPayload | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<ClientQuestionPayload | null>(null);
  const [revealData, setRevealData] = useState<QuestionRevealPayload | null>(null);
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardUpdatePayload | null>(null);
  const [finishedData, setFinishedData] = useState<GameFinishedPayload | null>(null);
  const [timerRemaining, setTimerRemaining] = useState<number>(20);

  const socket = getSocket();

  const generateQrCode = async (baseUrl: string, code: string) => {
    const clean = baseUrl.trim().replace(/\/$/, '');
    const joinUrl = `${clean}/join/${code}`;
    try {
      const url = await QRCode.toDataURL(joinUrl, {
        width: 320,
        margin: 1.5,
        color: { dark: '#16213A', light: '#FBF7EE' },
      });
      setQrCodeDataUrl(url);
    } catch {}
  };

  // Socket event subscriptions
  useEffect(() => {
    socket.on(SOCKET_EVENTS.ROOM_CREATED, async (payload: RoomCreatedPayload) => {
      setRoomCreated(payload);
      setPhase('LOBBY');
      sounds.playWheelLand();
      await generateQrCode(serverUrl, payload.code);
    });

    socket.on(SOCKET_EVENTS.LOBBY_UPDATE, (payload: LobbyUpdatePayload) => {
      setLobbyData(payload);
    });

    socket.on(SOCKET_EVENTS.WHEEL_SPIN, (payload: WheelSpinPayload) => {
      setWheelSpin(payload);
      setPhase('WHEEL');
      setRevealData(null);
    });

    socket.on(SOCKET_EVENTS.QUESTION_SHOW, (payload: ClientQuestionPayload) => {
      setCurrentQuestion(payload);
      setPhase('QUESTION');
      setRevealData(null);
      setTimerRemaining(Math.max(0, Math.ceil((payload.endsAt - Date.now()) / 1000)));
    });

    socket.on(SOCKET_EVENTS.QUESTION_REVEAL, (payload: QuestionRevealPayload) => {
      setRevealData(payload);
      setPhase('REVEAL');
    });

    socket.on(SOCKET_EVENTS.LEADERBOARD_UPDATE, (payload: LeaderboardUpdatePayload) => {
      setLeaderboardData(payload);
      setPhase('LEADERBOARD');
    });

    socket.on(SOCKET_EVENTS.GAME_FINISHED, (payload: GameFinishedPayload) => {
      setFinishedData(payload);
      setPhase('FINISHED');
      try {
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 } });
      } catch {}
    });

    return () => {
      socket.off(SOCKET_EVENTS.ROOM_CREATED);
      socket.off(SOCKET_EVENTS.LOBBY_UPDATE);
      socket.off(SOCKET_EVENTS.WHEEL_SPIN);
      socket.off(SOCKET_EVENTS.QUESTION_SHOW);
      socket.off(SOCKET_EVENTS.QUESTION_REVEAL);
      socket.off(SOCKET_EVENTS.LEADERBOARD_UPDATE);
      socket.off(SOCKET_EVENTS.GAME_FINISHED);
    };
  }, [socket]);

  // Host Keyboard Shortcuts: Space for Next, Esc to Pause/End
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === 'Space') {
        e.preventDefault();
        handleNextAction();
      } else if (e.code === 'Escape') {
        e.preventDefault();
        handleSkip();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  // Countdown timer in host view
  useEffect(() => {
    if (phase !== 'QUESTION' || !currentQuestion) return;
    const interval = setInterval(() => {
      const sec = Math.max(0, Math.ceil((currentQuestion.endsAt - Date.now()) / 1000));
      setTimerRemaining(sec);
      if (sec <= 0) clearInterval(interval);
    }, 250);
    return () => clearInterval(interval);
  }, [phase, currentQuestion]);

  const handleCreateRoom = () => {
    const all = getAllQuestions();
    const finalQuestionIds =
      selectedQuestionIds.length > 0
        ? selectedQuestionIds
        : all.slice(0, 10).map((item) => item.question.id);

    const quiz: Quiz = {
      id: `quiz_${Date.now()}`,
      title: quizTitle.trim() || 'Constitution Quiz',
      mode,
      questionIds: finalQuestionIds,
      custom: [],
      secondsPerQuestion,
    };

    socket.emit(SOCKET_EVENTS.ROOM_CREATE, {
      quiz,
      hostName: 'Host',
    });
  };

  const handleStartGame = () => {
    socket.emit(SOCKET_EVENTS.GAME_START);
  };

  const handleNextAction = () => {
    socket.emit(SOCKET_EVENTS.HOST_NEXT);
  };

  const handleSkip = () => {
    socket.emit(SOCKET_EVENTS.HOST_SKIP);
  };

  const handleRemovePlayer = (id: string) => {
    socket.emit(SOCKET_EVENTS.HOST_REMOVE_PLAYER, id);
  };

  const handleEndGame = () => {
    socket.emit(SOCKET_EVENTS.HOST_END);
  };

  const exportCSV = () => {
    if (!finishedData) return;
    let csv = 'Rank,Nickname,Score,Streak\n';
    for (const p of finishedData.finalStandings) {
      csv += `${p.rank},"${p.nickname}",${p.score},${p.streak}\n`;
    }
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Samvidhan_Results_${roomCreated?.code || 'game'}.csv`;
    a.click();
  };

  // Phase 1: Quiz Builder
  if (phase === 'BUILDER') {
    return (
      <div className="container-civic" style={{ maxWidth: 760 }}>
        <button onClick={onBack} className="civic-btn" style={{ marginBottom: '1.5rem' }}>
          ← Main Menu
        </button>

        <h2 className="font-display" style={{ fontSize: '2.2rem', marginBottom: '0.25rem' }}>
          Host a Game
        </h2>
        <p className="font-body" style={{ fontSize: '1.1rem', color: 'var(--color-ink-soft)', marginBottom: '2rem' }}>
          Configure session settings, create a room, and project to classroom or conference screen.
        </p>

        <div className="civic-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Server URL Input */}
          <div style={{ backgroundColor: '#FBF7EE', border: '2px solid #243B8C', padding: '1.25rem', borderRadius: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <label style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 700, color: '#243B8C' }}>
                🌐 BACKEND SERVER &amp; PUBLIC JOIN URL
              </label>
              {(serverUrl.includes('localhost') || serverUrl.includes('127.0.0.1')) && (
                <span style={{ fontSize: '0.75rem', backgroundColor: '#FFF3CD', color: '#856404', padding: '0.2rem 0.5rem', borderRadius: 4, fontWeight: 700 }}>
                  ⚠️ Localhost (Phone scan won't work)
                </span>
              )}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-ink-soft)', marginBottom: '0.5rem' }}>
              For mobile players to scan the QR code and join, enter your live Render URL (e.g. <code>https://samvidhan.onrender.com</code>):
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                value={serverUrl}
                onChange={(e) => {
                  setServerUrlState(e.target.value);
                  setServerUrl(e.target.value);
                }}
                placeholder="https://samvidhan.onrender.com"
                style={{
                  flex: 1,
                  padding: '0.65rem 0.85rem',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.95rem',
                  border: '1.5px solid var(--color-ink)',
                  borderRadius: 4,
                  backgroundColor: '#FFFFFF',
                  color: 'var(--color-ink)',
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem' }}>
              SESSION TITLE
            </label>
            <input
              type="text"
              value={quizTitle}
              onChange={(e) => setQuizTitle(e.target.value)}
              placeholder="e.g. Constitutional Law Seminar Quiz"
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                fontSize: '1.1rem',
                border: '2px solid var(--color-ink)',
                borderRadius: 4,
                backgroundColor: 'var(--color-bg)',
                color: 'var(--color-ink)',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem' }}>
              SESSION MODE
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <button
                type="button"
                onClick={() => setMode('quiz')}
                className="civic-btn"
                style={{
                  padding: '1rem',
                  backgroundColor: mode === 'quiz' ? '#1E6B49' : 'var(--color-surface)',
                  color: mode === 'quiz' ? '#FFFFFF' : 'var(--color-ink)',
                  borderColor: mode === 'quiz' ? '#1E6B49' : 'var(--color-ink)',
                }}
              >
                📜 Standard Quiz (10 Questions)
              </button>
              <button
                type="button"
                onClick={() => setMode('wheel')}
                className="civic-btn"
                style={{
                  padding: '1rem',
                  backgroundColor: mode === 'wheel' ? '#D9731A' : 'var(--color-surface)',
                  color: mode === 'wheel' ? '#FFFFFF' : 'var(--color-ink)',
                  borderColor: mode === 'wheel' ? '#D9731A' : 'var(--color-ink)',
                }}
              >
                🎡 Spin the Wheel (5 Synced Rounds)
              </button>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem' }}>
              SECONDS PER QUESTION
            </label>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              {[10, 20, 30, 45].map((sec) => (
                <button
                  key={sec}
                  type="button"
                  onClick={() => setSecondsPerQuestion(sec)}
                  className="civic-btn"
                  style={{
                    flex: 1,
                    padding: '0.6rem',
                    backgroundColor: secondsPerQuestion === sec ? 'var(--color-ink)' : 'var(--color-surface)',
                    color: secondsPerQuestion === sec ? 'var(--color-bg)' : 'var(--color-ink)',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                  }}
                >
                  {sec}s
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleCreateRoom}
            className="civic-btn civic-btn-primary"
            style={{ padding: '0.9rem', fontSize: '1.2rem', marginTop: '1rem' }}
          >
            Create Room &amp; Open Lobby →
          </button>
        </div>
      </div>
    );
  }

  // Phase 2: Lobby (Projector Ready)
  if (phase === 'LOBBY' && roomCreated) {
    return (
      <div className="container-civic" style={{ maxWidth: 960 }}>
        {/* Top Control Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <button onClick={onBack} className="civic-btn" style={{ padding: '0.4rem 0.8rem' }}>
            ✕ Exit Host
          </button>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button onClick={handleStartGame} className="civic-btn civic-btn-primary" style={{ padding: '0.6rem 1.5rem', fontSize: '1.1rem' }}>
              Start Game ({lobbyData?.playerCount || 0} Joined) ▶
            </button>
          </div>
        </div>

        {/* Projector View Cards: Big Code + QR Code */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          <div
            className="civic-card"
            style={{
              padding: '2.5rem 2rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              textAlign: 'center',
            }}
          >
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 700, color: '#D9731A', letterSpacing: '1px' }}>
              OPEN ON YOUR PHONE BROWSER:
            </div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '1.05rem',
                fontWeight: 700,
                color: '#243B8C',
                wordBreak: 'break-all',
                margin: '0.5rem 0',
                padding: '0.4rem 0.8rem',
                backgroundColor: '#FBF7EE',
                border: '1px solid #243B8C',
                borderRadius: 4,
              }}
            >
              {serverUrl.replace(/\/$/, '')}/join/{roomCreated.code}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-ink-soft)', marginTop: '0.5rem' }}>
              Or enter Room Code on website:
            </div>
            <div
              className="font-display"
              style={{
                fontSize: '4.8rem',
                lineHeight: 1,
                letterSpacing: '8px',
                color: '#16213A',
                padding: '0.5rem 1rem',
                border: '3px solid #16213A',
                borderRadius: 8,
                backgroundColor: '#FFFFFF',
                boxShadow: 'var(--shadow-ink)',
                margin: '1rem 0',
              }}
            >
              {roomCreated.code}
            </div>
            <div style={{ fontSize: '0.9rem', color: 'var(--color-ink-soft)', fontFamily: 'var(--font-mono)' }}>
              Desktop Shortcut: Press Spacebar to Start
            </div>
          </div>

          {/* Large QR Code for phone scan */}
          <div
            className="civic-card"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1.5rem',
              textAlign: 'center',
            }}
          >
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              SCAN TO JOIN INSTANTLY
            </div>
            {qrCodeDataUrl ? (
              <img
                src={qrCodeDataUrl}
                alt="QR Code"
                style={{ width: 200, height: 200, border: '2px solid #16213A', borderRadius: 6, boxShadow: 'var(--shadow-ink)' }}
              />
            ) : (
              <div style={{ width: 200, height: 200, backgroundColor: 'rgba(0,0,0,0.05)' }} />
            )}

            {/* In-place URL updater if it's localhost or needs change */}
            <div style={{ marginTop: '0.75rem', width: '100%', maxWidth: 300 }}>
              {(serverUrl.includes('localhost') || serverUrl.includes('127.0.0.1')) && (
                <div style={{ fontSize: '0.75rem', color: '#856404', backgroundColor: '#FFF3CD', border: '1px solid #856404', borderRadius: 4, padding: '0.35rem 0.5rem', marginBottom: '0.5rem', textAlign: 'left' }}>
                  ⚠️ QR currently contains localhost. Enter your Render backend URL below so mobile phones can connect:
                </div>
              )}
              <div style={{ display: 'flex', gap: '0.3rem' }}>
                <input
                  type="text"
                  value={serverUrl}
                  onChange={(e) => setServerUrlState(e.target.value)}
                  placeholder="https://samvidhan.onrender.com"
                  style={{
                    flex: 1,
                    padding: '0.3rem 0.5rem',
                    fontSize: '0.75rem',
                    fontFamily: 'var(--font-mono)',
                    border: '1px solid var(--color-ink)',
                    borderRadius: 4,
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    setServerUrl(serverUrl);
                    generateQrCode(serverUrl, roomCreated.code);
                  }}
                  className="civic-btn"
                  style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                >
                  Update QR
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Live Connected Players Deck */}
        <div className="civic-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 className="font-display" style={{ fontSize: '1.3rem', margin: 0 }}>
              Joined Scholars ({lobbyData?.playerCount || 0})
            </h3>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--color-ink-soft)' }}>
              100 max capacity
            </span>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
            {lobbyData?.players.map((p) => (
              <div
                key={p.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.4rem 0.8rem',
                  backgroundColor: 'var(--color-surface-elevated)',
                  border: '1.5px solid var(--color-ink)',
                  borderRadius: 4,
                  fontSize: '0.9rem',
                  fontWeight: 600,
                }}
              >
                <span>{p.nickname}</span>
                <button
                  onClick={() => handleRemovePlayer(p.id)}
                  title="Remove Player"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#B3261E', fontWeight: 800 }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Phase 3: Synchronized Wheel Spin
  if (phase === 'WHEEL' && wheelSpin) {
    return (
      <div className="container-civic" style={{ maxWidth: 860, textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
            ROUND {wheelSpin.round} OF {wheelSpin.totalRounds}
          </span>
          <button onClick={handleSkip} className="civic-btn" style={{ padding: '0.3rem 0.8rem', fontSize: '0.85rem' }}>
            Skip Spin (Esc)
          </button>
        </div>

        <h2 className="font-display" style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>
          Synchronized Wheel Spin
        </h2>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <SpinningWheel
            targetWinner={wheelSpin.organ}
            targetSeed={wheelSpin.seed}
            showSpinButton={false}
            size={400}
          />
        </div>
      </div>
    );
  }

  // Phase 4: Host Projector Question View
  if (phase === 'QUESTION' && currentQuestion) {
    const organColor = currentQuestion.organ === 'Legislature' ? '#D9731A' : currentQuestion.organ === 'Judiciary' ? '#1E6B49' : '#16213A';

    return (
      <div className="container-civic" style={{ maxWidth: 960 }}>
        {/* Host Control Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span className={`organ-badge organ-badge-${currentQuestion.organ?.toLowerCase() || 'executive'}`}>
              {currentQuestion.organ} {currentQuestion.articleNumber && `• Article ${currentQuestion.articleNumber}`}
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', fontWeight: 700 }}>
              Question {currentQuestion.index + 1} of {currentQuestion.total}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.4rem', fontWeight: 800 }}>
              ⏱ {timerRemaining}s
            </div>
            <button onClick={handleSkip} className="civic-btn" style={{ padding: '0.4rem 1rem' }}>
              Skip to Reveal (Esc)
            </button>
          </div>
        </div>

        {/* Projector Oversized Question Card */}
        <div
          className="civic-card"
          style={{
            padding: '2.5rem 2.5rem',
            borderLeft: `10px solid ${organColor}`,
            marginBottom: '1.5rem',
          }}
        >
          <h2
            className="font-display"
            style={{
              fontSize: '2.2rem',
              lineHeight: 1.25,
              color: 'var(--color-ink)',
              marginBottom: '2rem',
            }}
          >
            {currentQuestion.text}
          </h2>

          {/* Options in 2x2 Projector Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            {currentQuestion.options.map((opt, i) => (
              <div
                key={i}
                style={{
                  padding: '1.25rem 1.5rem',
                  backgroundColor: 'var(--color-surface)',
                  border: '2.5px solid var(--color-ink)',
                  borderRadius: 6,
                  boxShadow: 'var(--shadow-ink)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  fontSize: '1.3rem',
                  fontWeight: 600,
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '1.2rem',
                    fontWeight: 800,
                    width: 36,
                    height: 36,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'var(--color-bg)',
                    border: '1.5px solid var(--color-ink)',
                    borderRadius: 4,
                  }}
                >
                  {String.fromCharCode(65 + i)}
                </span>
                <span>{opt}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Phase 5: Question Reveal View (with Answer Distribution)
  if (phase === 'REVEAL' && revealData) {
    const dist = revealData.distribution || [0, 0, 0, 0];
    const totalAnswers = dist.reduce((a, b) => a + b, 0);

    return (
      <div className="container-civic" style={{ maxWidth: 860 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 className="font-display" style={{ fontSize: '2rem', margin: 0 }}>
            Question Reveal
          </h2>
          <button onClick={handleNextAction} className="civic-btn civic-btn-primary" style={{ padding: '0.65rem 1.5rem' }}>
            Show Leaderboard (Space) →
          </button>
        </div>

        {/* Answer Explanation */}
        <div className="civic-card" style={{ padding: '2rem', marginBottom: '2rem', borderLeft: '8px solid #1E6B49' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: '#1E6B49', fontWeight: 800, marginBottom: '0.5rem' }}>
            CORRECT ANSWER: OPTION {String.fromCharCode(65 + revealData.correctIndex)}
          </div>
          <p className="font-body" style={{ fontSize: '1.4rem', color: 'var(--color-ink)', margin: 0 }}>
            {revealData.explanation}
          </p>
        </div>

        {/* Answer Distribution Bars */}
        <div className="civic-card" style={{ padding: '1.5rem' }}>
          <h3 className="font-display" style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>
            Player Responses Distribution ({totalAnswers} Total)
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {['A', 'B', 'C', 'D'].map((letter, i) => {
              const count = dist[i] || 0;
              const pct = totalAnswers > 0 ? Math.round((count / totalAnswers) * 100) : 0;
              const isCorrect = i === revealData.correctIndex;
              return (
                <div key={letter} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, width: 24 }}>
                    {letter}:
                  </span>
                  <div style={{ flex: 1, height: 26, backgroundColor: 'rgba(22, 33, 58, 0.08)', borderRadius: 4, overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${pct}%`,
                        backgroundColor: isCorrect ? '#1E6B49' : '#B3261E',
                        display: 'flex',
                        alignItems: 'center',
                        paddingLeft: '0.5rem',
                        color: '#FFFFFF',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        transition: 'width 300ms ease',
                      }}
                    >
                      {count > 0 && `${count} (${pct}%)`}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Phase 6: Leaderboard (Projector Top 10)
  if (phase === 'LEADERBOARD' && leaderboardData) {
    return (
      <div className="container-civic" style={{ maxWidth: 860 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 className="font-display" style={{ fontSize: '2.4rem', margin: 0 }}>
            Current Standings
          </h2>
          <button onClick={handleNextAction} className="civic-btn civic-btn-primary" style={{ padding: '0.65rem 1.5rem', fontSize: '1.05rem' }}>
            Next Question (Space) →
          </button>
        </div>

        <div className="civic-card" style={{ padding: '1.5rem' }}>
          {leaderboardData.topEntries.map((p) => (
            <div
              key={p.playerId}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.85rem 1.25rem',
                borderBottom: '1.5px solid rgba(22, 33, 58, 0.1)',
                fontSize: '1.15rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span className="font-display" style={{ fontSize: '1.3rem', width: 36, color: p.rank === 1 ? '#B8860B' : 'var(--color-ink)' }}>
                  #{p.rank}
                </span>
                <span style={{ fontWeight: 700 }}>{p.nickname}</span>
                {p.streak > 1 && <span style={{ fontSize: '0.9rem' }}>🔥{p.streak}</span>}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontFamily: 'var(--font-mono)' }}>
                <span style={{ fontWeight: 800 }}>{p.score} pts</span>
                <span style={{ fontSize: '0.9rem', color: (p.rankDelta || 0) > 0 ? '#1E6B49' : (p.rankDelta || 0) < 0 ? '#B3261E' : 'var(--color-ink-soft)' }}>
                  {(p.rankDelta || 0) > 0 ? `▲${p.rankDelta}` : (p.rankDelta || 0) < 0 ? `▼${Math.abs(p.rankDelta || 0)}` : '•'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Phase 7: Finished Session (Podium & CSV Export)
  if (phase === 'FINISHED' && finishedData) {
    return (
      <div className="container-civic" style={{ maxWidth: 860, textAlign: 'center' }}>
        <h2 className="font-display" style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>
          Session Finished
        </h2>
        <p className="font-body" style={{ fontSize: '1.25rem', color: 'var(--color-ink-soft)', marginBottom: '2.5rem' }}>
          Official Standings of the Assembly
        </p>

        {/* Podium */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: '1.5rem', marginBottom: '3rem' }}>
          {finishedData.podium[1] && (
            <div style={{ width: 180 }}>
              <div className="font-display" style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>{finishedData.podium[1].nickname}</div>
              <div
                style={{
                  height: 130,
                  backgroundColor: '#D9731A',
                  color: '#FFFFFF',
                  border: '3px solid #16213A',
                  borderRadius: '6px 6px 0 0',
                  boxShadow: 'var(--shadow-ink)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span className="font-display" style={{ fontSize: '2.5rem' }}>2</span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>{finishedData.podium[1].score} pts</span>
              </div>
            </div>
          )}

          {finishedData.podium[0] && (
            <div style={{ width: 200 }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>👑</div>
              <div className="font-display" style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.5rem' }}>{finishedData.podium[0].nickname}</div>
              <div
                style={{
                  height: 180,
                  backgroundColor: '#B8860B',
                  color: '#FFFFFF',
                  border: '3px solid #16213A',
                  borderRadius: '6px 6px 0 0',
                  boxShadow: 'var(--shadow-ink-lg)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span className="font-display" style={{ fontSize: '3.5rem' }}>1</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', fontWeight: 700 }}>{finishedData.podium[0].score} pts</span>
              </div>
            </div>
          )}

          {finishedData.podium[2] && (
            <div style={{ width: 180 }}>
              <div className="font-display" style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>{finishedData.podium[2].nickname}</div>
              <div
                style={{
                  height: 100,
                  backgroundColor: '#1E6B49',
                  color: '#FFFFFF',
                  border: '3px solid #16213A',
                  borderRadius: '6px 6px 0 0',
                  boxShadow: 'var(--shadow-ink)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span className="font-display" style={{ fontSize: '2.2rem' }}>3</span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>{finishedData.podium[2].score} pts</span>
              </div>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
          <button onClick={exportCSV} className="civic-btn" style={{ padding: '0.75rem 1.5rem', fontSize: '1rem' }}>
            📥 Export Results CSV
          </button>
          <button onClick={onBack} className="civic-btn civic-btn-primary" style={{ padding: '0.75rem 2rem', fontSize: '1rem' }}>
            Finish &amp; Return Home
          </button>
        </div>
      </div>
    );
  }

  return null;
};

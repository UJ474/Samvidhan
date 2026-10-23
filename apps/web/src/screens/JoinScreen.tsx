import React, { useState, useEffect } from 'react';
import { getSocket } from '../services/socket.js';
import {
  SOCKET_EVENTS,
  type RoomJoinedPayload,
  type LobbyUpdatePayload,
  type WheelSpinPayload,
  type ClientQuestionPayload,
  type AnswerAckPayload,
  type QuestionRevealPayload,
  type LeaderboardUpdatePayload,
  type GameFinishedPayload,
} from '@samvidhan/protocol';
import { SpinningWheel } from '../components/SpinningWheel.js';
import { Chakra } from '../components/Chakra.js';
import { sounds } from '../services/sound.js';
import confetti from 'canvas-confetti';

interface JoinScreenProps {
  onBack: () => void;
  prefilledCode?: string;
}

export const JoinScreen: React.FC<JoinScreenProps> = ({ onBack, prefilledCode = '' }) => {
  const [code, setCode] = useState<string>(prefilledCode.toUpperCase());
  const [nickname, setNickname] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isJoining, setIsJoining] = useState<boolean>(false);

  // Live Game States
  const [gameState, setGameState] = useState<
    'CONNECTING' | 'LOBBY' | 'WHEEL' | 'QUESTION' | 'REVEAL' | 'LEADERBOARD' | 'FINISHED'
  >('CONNECTING');

  const [roomInfo, setRoomInfo] = useState<RoomJoinedPayload | null>(null);
  const [lobbyData, setLobbyData] = useState<LobbyUpdatePayload | null>(null);
  const [wheelSpin, setWheelSpin] = useState<WheelSpinPayload | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<ClientQuestionPayload | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [revealData, setRevealData] = useState<QuestionRevealPayload | null>(null);
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardUpdatePayload | null>(null);
  const [finishedData, setFinishedData] = useState<GameFinishedPayload | null>(null);
  const [timerRemaining, setTimerRemaining] = useState<number>(20);

  const socket = getSocket();

  useEffect(() => {
    socket.on(SOCKET_EVENTS.ROOM_JOINED, (payload: RoomJoinedPayload) => {
      setRoomInfo(payload);
      setGameState('LOBBY');
      setIsJoining(false);
      setErrorMsg('');
      sounds.playCorrect();
    });

    socket.on(SOCKET_EVENTS.LOBBY_UPDATE, (payload: LobbyUpdatePayload) => {
      setLobbyData(payload);
    });

    socket.on(SOCKET_EVENTS.WHEEL_SPIN, (payload: WheelSpinPayload) => {
      setWheelSpin(payload);
      setGameState('WHEEL');
      setSelectedAnswer(null);
      setIsLocked(false);
      setRevealData(null);
    });

    socket.on(SOCKET_EVENTS.QUESTION_SHOW, (payload: ClientQuestionPayload) => {
      setCurrentQuestion(payload);
      setGameState('QUESTION');
      setSelectedAnswer(null);
      setIsLocked(false);
      setRevealData(null);

      // Countdown
      const remainingSec = Math.max(0, Math.ceil((payload.endsAt - Date.now()) / 1000));
      setTimerRemaining(remainingSec);
    });

    socket.on(SOCKET_EVENTS.ANSWER_ACK, (ack: AnswerAckPayload) => {
      setIsLocked(ack.locked);
      sounds.playPegTick();
    });

    socket.on(SOCKET_EVENTS.QUESTION_REVEAL, (payload: QuestionRevealPayload) => {
      setRevealData(payload);
      setGameState('REVEAL');
      if (payload.yourResult?.correct) {
        sounds.playCorrect();
      } else {
        sounds.playWrong();
      }
    });

    socket.on(SOCKET_EVENTS.LEADERBOARD_UPDATE, (payload: LeaderboardUpdatePayload) => {
      setLeaderboardData(payload);
      setGameState('LEADERBOARD');
    });

    socket.on(SOCKET_EVENTS.GAME_FINISHED, (payload: GameFinishedPayload) => {
      setFinishedData(payload);
      setGameState('FINISHED');
      try {
        confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
      } catch {}
    });

    socket.on(SOCKET_EVENTS.ROOM_CLOSED, (payload: { reason: string }) => {
      setErrorMsg(payload.reason || 'The host has ended this game session.');
      setGameState('CONNECTING');
      setRoomInfo(null);
      setCurrentQuestion(null);
      setRevealData(null);
      setIsLocked(false);
    });

    socket.on(SOCKET_EVENTS.ERROR, (payload: { message: string }) => {
      setErrorMsg(payload.message || 'Error occurred');
      setIsJoining(false);
    });

    return () => {
      socket.off(SOCKET_EVENTS.ROOM_JOINED);
      socket.off(SOCKET_EVENTS.LOBBY_UPDATE);
      socket.off(SOCKET_EVENTS.WHEEL_SPIN);
      socket.off(SOCKET_EVENTS.QUESTION_SHOW);
      socket.off(SOCKET_EVENTS.ANSWER_ACK);
      socket.off(SOCKET_EVENTS.QUESTION_REVEAL);
      socket.off(SOCKET_EVENTS.LEADERBOARD_UPDATE);
      socket.off(SOCKET_EVENTS.GAME_FINISHED);
      socket.off(SOCKET_EVENTS.ROOM_CLOSED);
      socket.off(SOCKET_EVENTS.ERROR);
    };
  }, [socket]);

  // Clock Countdown effect
  useEffect(() => {
    if (gameState !== 'QUESTION' || !currentQuestion) return;

    const interval = setInterval(() => {
      const sec = Math.max(0, Math.ceil((currentQuestion.endsAt - Date.now()) / 1000));
      setTimerRemaining(sec);
      if (sec <= 0) {
        clearInterval(interval);
      }
    }, 250);

    return () => clearInterval(interval);
  }, [gameState, currentQuestion]);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim().length < 4) {
      setErrorMsg('Please enter a valid 6-character room code');
      return;
    }
    if (nickname.trim().length < 2) {
      setErrorMsg('Nickname must be at least 2 characters');
      return;
    }

    setErrorMsg('');
    setIsJoining(true);
    socket.emit(SOCKET_EVENTS.ROOM_JOIN, {
      code: code.trim().toUpperCase(),
      nickname: nickname.trim(),
    });
  };

  // Answer selection handling
  const handleSelectAnswer = (answerIdx: number) => {
    if (isLocked || !currentQuestion) return;
    setSelectedAnswer(answerIdx);
    setIsLocked(true);
    socket.emit(SOCKET_EVENTS.ANSWER_SUBMIT, {
      questionIndex: currentQuestion.index,
      choice: answerIdx,
    });
    sounds.playPegTick();
  };

  const handleLeaveGame = () => {
    setGameState('CONNECTING');
    setRoomInfo(null);
    setCurrentQuestion(null);
    setRevealData(null);
    setIsLocked(false);
    onBack();
  };

  const renderLeaveBar = () => (
    <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '1rem' }}>
      <button onClick={handleLeaveGame} className="civic-btn" style={{ padding: '0.35rem 0.8rem', fontSize: '0.85rem' }}>
        ← Leave Room
      </button>
    </div>
  );

  // View: Code and Nickname Form
  if (gameState === 'CONNECTING' && !roomInfo) {
    return (
      <div className="container-civic" style={{ maxWidth: 520, textAlign: 'center' }}>
        <button onClick={onBack} className="civic-btn" style={{ marginBottom: '2rem', float: 'left' }}>
          ← Back
        </button>
        <div style={{ clear: 'both' }} />

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
          <Chakra size={48} />
        </div>

        <h2 className="font-display" style={{ fontSize: '2.2rem', marginBottom: '0.5rem' }}>
          Join Live Session
        </h2>
        <p className="font-body" style={{ fontSize: '1.1rem', color: 'var(--color-ink-soft)', marginBottom: '2rem' }}>
          Enter the room code shared by your teacher or quiz host
        </p>

        <form onSubmit={handleJoin} className="civic-card" style={{ padding: '2rem' }}>
          {errorMsg && (
            <div
              style={{
                backgroundColor: 'rgba(179, 38, 30, 0.1)',
                border: '1.5px solid #B3261E',
                color: '#B3261E',
                padding: '0.6rem 1rem',
                borderRadius: 4,
                marginBottom: '1.25rem',
                fontSize: '0.9rem',
              }}
            >
              {errorMsg}
            </div>
          )}

          <div style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
            <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem' }}>
              ROOM CODE
            </label>
            <input
              type="text"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. 7K2M9X"
              autoFocus
              style={{
                width: '100%',
                padding: '0.85rem 1rem',
                fontSize: '1.6rem',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                letterSpacing: '4px',
                textAlign: 'center',
                border: '2px solid var(--color-ink)',
                borderRadius: 4,
                backgroundColor: 'var(--color-bg)',
                color: 'var(--color-ink)',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ marginBottom: '2rem', textAlign: 'left' }}>
            <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem' }}>
              YOUR NICKNAME
            </label>
            <input
              type="text"
              maxLength={16}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="e.g. Bhimrao"
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                fontSize: '1.1rem',
                border: '2px solid var(--color-ink)',
                borderRadius: 4,
                backgroundColor: 'var(--color-bg)',
                color: 'var(--color-ink)',
                outline: 'none',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={isJoining}
            className="civic-btn civic-btn-chakra"
            style={{ width: '100%', padding: '0.85rem', fontSize: '1.1rem' }}
          >
            {isJoining ? 'Joining Room...' : 'Join Game →'}
          </button>
        </form>
      </div>
    );
  }

  // View: Lobby
  if (gameState === 'LOBBY') {
    return (
      <div className="container-civic" style={{ maxWidth: 640, textAlign: 'center' }}>
        {renderLeaveBar()}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
          <Chakra size={44} spinning />
        </div>

        <h2 className="font-display" style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>
          {roomInfo?.quizTitle || 'Live Constitution Room'}
        </h2>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', color: '#243B8C', fontWeight: 700, marginBottom: '2rem' }}>
          ROOM CODE: {roomInfo?.code}
        </div>

        <div className="civic-card" style={{ padding: '2rem', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.25rem' }}>
            You are joined as <span style={{ color: '#D9731A' }}>{roomInfo?.nickname}</span>
          </div>
          <p style={{ color: 'var(--color-ink-soft)', fontSize: '0.95rem' }}>
            Waiting for the host to start the session...
          </p>

          <div style={{ marginTop: '1.5rem', borderTop: '1px dashed var(--color-ink)', paddingTop: '1.25rem' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.75rem' }}>
              PLAYERS IN ROOM ({lobbyData?.playerCount || 1})
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center' }}>
              {lobbyData?.players.map((p) => (
                <span
                  key={p.id}
                  style={{
                    padding: '0.3rem 0.75rem',
                    backgroundColor: p.id === roomInfo?.playerId ? '#243B8C' : 'var(--color-bg)',
                    color: p.id === roomInfo?.playerId ? '#FFFFFF' : 'var(--color-ink)',
                    border: '1.5px solid var(--color-ink)',
                    borderRadius: 20,
                    fontSize: '0.85rem',
                    fontWeight: 600,
                  }}
                >
                  {p.nickname} {p.id === roomInfo?.playerId && '(You)'}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // View: Wheel Spin Phase
  if (gameState === 'WHEEL' && wheelSpin) {
    return (
      <div className="container-civic" style={{ maxWidth: 720, textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', fontWeight: 700, color: '#243B8C', marginBottom: '0.5rem' }}>
          SYNCHRONIZED WHEEL SPIN • ROUND {wheelSpin.round} OF {wheelSpin.totalRounds}
        </div>
        <h2 className="font-display" style={{ fontSize: '2rem', marginBottom: '1.5rem' }}>
          Wheel is Spinning...
        </h2>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <SpinningWheel
            targetWinner={wheelSpin.organ}
            targetSeed={wheelSpin.seed}
            showSpinButton={false}
            size={340}
          />
        </div>
      </div>
    );
  }

  // View: Question Phase
  if (gameState === 'QUESTION' && currentQuestion) {
    const organColor = currentQuestion.organ === 'Legislature' ? '#D9731A' : currentQuestion.organ === 'Judiciary' ? '#1E6B49' : '#16213A';

    return (
      <div className="container-civic" style={{ maxWidth: 720 }}>
        {/* Progress & Timer Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', fontWeight: 700 }}>
            Question {currentQuestion.index + 1} of {currentQuestion.total}
          </div>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '1.1rem',
              fontWeight: 800,
              color: timerRemaining <= 5 ? '#B3261E' : 'var(--color-ink)',
            }}
          >
            ⏱ {timerRemaining}s
          </div>
        </div>

        {/* Timer countdown bar */}
        <div style={{ height: 6, backgroundColor: 'rgba(22, 33, 58, 0.1)', borderRadius: 3, marginBottom: '1.5rem', overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              width: `${(timerRemaining / 20) * 100}%`,
              backgroundColor: timerRemaining <= 5 ? '#B3261E' : '#243B8C',
              transition: 'width 250ms linear',
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
          {currentQuestion.organ && (
            <div style={{ marginBottom: '1rem' }}>
              <span className={`organ-badge organ-badge-${currentQuestion.organ.toLowerCase()}`}>
                {currentQuestion.organ} {currentQuestion.articleNumber && `• Article ${currentQuestion.articleNumber}`}
              </span>
            </div>
          )}

          <h3 className="font-display" style={{ fontSize: '1.5rem', lineHeight: 1.3, marginBottom: '1.75rem' }}>
            {currentQuestion.text}
          </h3>

          {/* Option Slips */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {currentQuestion.options.map((opt, i) => {
              const isSelected = selectedAnswer === i;
              return (
                <button
                  key={i}
                  onClick={() => handleSelectAnswer(i)}
                  disabled={isLocked}
                  className="civic-btn"
                  style={{
                    justifyContent: 'flex-start',
                    padding: '1.1rem 1.25rem',
                    fontSize: '1.1rem',
                    textAlign: 'left',
                    backgroundColor: isSelected ? '#243B8C' : 'var(--color-surface)',
                    color: isSelected ? '#FFFFFF' : 'var(--color-ink)',
                    borderColor: isSelected ? '#243B8C' : 'var(--color-ink)',
                  }}
                >
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, marginRight: '0.75rem' }}>
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span style={{ flex: 1 }}>{opt}</span>
                  {isSelected && <span>🔒 Locked</span>}
                </button>
              );
            })}
          </div>
        </div>

        {isLocked && (
          <div
            style={{
              textAlign: 'center',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.9rem',
              color: 'var(--color-ink-soft)',
            }}
          >
            Answer locked in. Waiting for reveal...
          </div>
        )}
      </div>
    );
  }

  // View: Reveal Phase
  if (gameState === 'REVEAL' && revealData) {
    const your = revealData.yourResult;
    return (
      <div className="container-civic" style={{ maxWidth: 680, textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <div
            style={{
              padding: '1rem 2rem',
              borderRadius: 50,
              backgroundColor: your?.correct ? '#1E6B49' : '#B3261E',
              color: '#FFFFFF',
              border: '2px solid var(--color-ink)',
              boxShadow: 'var(--shadow-ink)',
            }}
          >
            <div className="font-display" style={{ fontSize: '1.8rem' }}>
              {your?.correct ? '✔ Correct!' : '✘ Incorrect!'}
            </div>
            {your?.correct && (
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', fontWeight: 700 }}>
                +{your.pointsAwarded} PTS {your.currentStreak > 1 && `(🔥 ${your.currentStreak} Streak)`}
              </div>
            )}
          </div>
        </div>

        {/* Explanation Card */}
        <div className="civic-card" style={{ padding: '1.5rem', marginBottom: '1.5rem', textAlign: 'left' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#1E6B49', fontWeight: 700, marginBottom: '0.5rem' }}>
            CONSTITUTIONAL EXPLANATION
          </div>
          <p className="font-body" style={{ fontSize: '1.25rem', margin: 0 }}>
            {revealData.explanation}
          </p>
        </div>

        {your && (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.95rem', color: 'var(--color-ink-soft)' }}>
            Current Rank: #{your.rank} • Total Points: {your.currentScore}
          </div>
        )}
      </div>
    );
  }

  // View: Leaderboard Phase
  if (gameState === 'LEADERBOARD' && leaderboardData) {
    return (
      <div className="container-civic" style={{ maxWidth: 640 }}>
        <h2 className="font-display" style={{ fontSize: '2rem', textAlign: 'center', marginBottom: '1.5rem' }}>
          Leaderboard
        </h2>

        <div className="civic-card" style={{ padding: '1rem', marginBottom: '1.5rem' }}>
          {leaderboardData.topEntries.map((entry) => {
            const isMe = entry.playerId === roomInfo?.playerId;
            const delta = entry.rankDelta || 0;
            return (
              <div
                key={entry.playerId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 1rem',
                  borderBottom: '1px solid rgba(22, 33, 58, 0.1)',
                  backgroundColor: isMe ? 'rgba(36, 59, 140, 0.08)' : 'transparent',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, width: 28 }}>
                    #{entry.rank}
                  </span>
                  <span style={{ fontWeight: isMe ? 800 : 600 }}>
                    {entry.nickname} {isMe && '(You)'}
                  </span>
                  {entry.streak > 1 && <span>🔥{entry.streak}</span>}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                    {entry.score} pts
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.85rem',
                      color: delta > 0 ? '#1E6B49' : delta < 0 ? '#B3261E' : 'var(--color-ink-soft)',
                    }}
                  >
                    {delta > 0 ? `▲${delta}` : delta < 0 ? `▼${Math.abs(delta)}` : '•'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // View: Final Podium
  if (gameState === 'FINISHED' && finishedData) {
    return (
      <div className="container-civic" style={{ maxWidth: 680, textAlign: 'center' }}>
        <h2 className="font-display" style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>
          Final Podium
        </h2>
        <p className="font-body" style={{ fontSize: '1.15rem', color: 'var(--color-ink-soft)', marginBottom: '2rem' }}>
          Game Finished • Honor to the Scholars
        </p>

        {/* Podium Steps */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: '1rem', marginBottom: '2.5rem' }}>
          {/* Rank 2 */}
          {finishedData.podium[1] && (
            <div style={{ width: 140 }}>
              <div style={{ fontWeight: 700, marginBottom: '0.5rem' }}>{finishedData.podium[1].nickname}</div>
              <div
                style={{
                  height: 110,
                  backgroundColor: '#D9731A',
                  color: '#FFFFFF',
                  border: '2px solid var(--color-ink)',
                  borderRadius: '6px 6px 0 0',
                  boxShadow: 'var(--shadow-ink)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span className="font-display" style={{ fontSize: '2rem' }}>2</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>{finishedData.podium[1].score} pts</span>
              </div>
            </div>
          )}

          {/* Rank 1 */}
          {finishedData.podium[0] && (
            <div style={{ width: 150 }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>👑</div>
              <div style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: '0.5rem' }}>{finishedData.podium[0].nickname}</div>
              <div
                style={{
                  height: 150,
                  backgroundColor: '#B8860B',
                  color: '#FFFFFF',
                  border: '2px solid var(--color-ink)',
                  borderRadius: '6px 6px 0 0',
                  boxShadow: 'var(--shadow-ink-lg)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span className="font-display" style={{ fontSize: '2.5rem' }}>1</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', fontWeight: 700 }}>{finishedData.podium[0].score} pts</span>
              </div>
            </div>
          )}

          {/* Rank 3 */}
          {finishedData.podium[2] && (
            <div style={{ width: 140 }}>
              <div style={{ fontWeight: 700, marginBottom: '0.5rem' }}>{finishedData.podium[2].nickname}</div>
              <div
                style={{
                  height: 80,
                  backgroundColor: '#1E6B49',
                  color: '#FFFFFF',
                  border: '2px solid var(--color-ink)',
                  borderRadius: '6px 6px 0 0',
                  boxShadow: 'var(--shadow-ink)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span className="font-display" style={{ fontSize: '1.8rem' }}>3</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>{finishedData.podium[2].score} pts</span>
              </div>
            </div>
          )}
        </div>

        <button onClick={handleLeaveGame} className="civic-btn civic-btn-primary" style={{ padding: '0.8rem 2.5rem', fontSize: '1.1rem' }}>
          Back to Main Menu
        </button>
      </div>
    );
  }

  return null;
};

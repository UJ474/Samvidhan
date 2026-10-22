import { z } from 'zod';
import type { Organ, Question, Quiz, LeaderboardEntry } from '@samvidhan/core';

// ----------------- Enums & Base Schemas -----------------

export const OrganSchema = z.enum(['Legislature', 'Executive', 'Judiciary']);

export const QuestionSchema = z.object({
  id: z.string(),
  q: z.string(),
  options: z.array(z.string()).min(2).max(4),
  answer: z.number().int().min(0),
  needsReview: z.boolean().optional(),
});

export const QuizSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(60),
  mode: z.enum(['quiz', 'wheel']),
  questionIds: z.array(z.string()),
  custom: z.array(QuestionSchema),
  secondsPerQuestion: z.number().int().min(10).max(60).default(20),
});

export type GameState =
  | 'LOBBY'
  | 'WHEEL'
  | 'QUESTION'
  | 'REVEAL'
  | 'LEADERBOARD'
  | 'FINISHED';

// ----------------- Socket Event Names -----------------

export const SOCKET_EVENTS = {
  // Client -> Server
  ROOM_CREATE: 'room:create',
  ROOM_JOIN: 'room:join',
  GAME_START: 'game:start',
  ANSWER_SUBMIT: 'answer:submit',
  HOST_NEXT: 'host:next',
  HOST_SKIP: 'host:skip',
  HOST_PAUSE: 'host:pause',
  HOST_END: 'host:end',
  HOST_REMOVE_PLAYER: 'host:remove_player',

  // Server -> Client
  ROOM_CREATED: 'room:created',
  ROOM_JOINED: 'room:joined',
  LOBBY_UPDATE: 'lobby:update',
  WHEEL_SPIN: 'wheel:spin',
  QUESTION_SHOW: 'question:show',
  ANSWER_ACK: 'answer:ack',
  QUESTION_REVEAL: 'question:reveal',
  LEADERBOARD_UPDATE: 'leaderboard:update',
  GAME_FINISHED: 'game:finished',
  ROOM_CLOSED: 'room:closed',
  ERROR: 'error:message',
} as const;

// ----------------- Client -> Server Payloads & Schemas -----------------

export const RoomCreatePayloadSchema = z.object({
  quiz: QuizSchema,
  hostName: z.string().min(1).max(24).optional().default('Host'),
});
export type RoomCreatePayload = z.infer<typeof RoomCreatePayloadSchema>;

export const RoomJoinPayloadSchema = z.object({
  code: z.string().min(4).max(8).transform((c) => c.toUpperCase().trim()),
  nickname: z
    .string()
    .trim()
    .min(2, 'Nickname must be at least 2 characters')
    .max(16, 'Nickname must be at most 16 characters'),
  playerToken: z.string().optional(),
});
export type RoomJoinPayload = z.infer<typeof RoomJoinPayloadSchema>;

export const AnswerSubmitPayloadSchema = z.object({
  questionIndex: z.number().int().min(0),
  choice: z.number().int().min(0).max(3),
});
export type AnswerSubmitPayload = z.infer<typeof AnswerSubmitPayloadSchema>;

// ----------------- Server -> Client Payloads -----------------

export interface RoomCreatedPayload {
  code: string;
  hostToken: string;
  joinUrl: string;
  roomState: GameState;
  quiz: Quiz;
}

export interface PlayerPublic {
  id: string;
  nickname: string;
  score: number;
  streak: number;
  isConnected: boolean;
}

export interface RoomJoinedPayload {
  playerId: string;
  playerToken: string;
  nickname: string;
  code: string;
  roomState: GameState;
  quizTitle: string;
  mode: 'quiz' | 'wheel';
}

export interface LobbyUpdatePayload {
  players: PlayerPublic[];
  playerCount: number;
  quizTitle: string;
  mode: 'quiz' | 'wheel';
  totalQuestions: number;
}

export interface WheelSpinPayload {
  organ: Organ;
  seed: number;
  startsAt: number;
  durationMs: number;
  round: number;
  totalRounds: number;
}

export interface ClientQuestionPayload {
  index: number;
  total: number;
  text: string;
  options: string[];
  endsAt: number;
  serverNow: number;
  organ?: Organ;
  articleNumber?: string;
  answeredCount: number;
  totalPlayers: number;
}

export interface AnswerAckPayload {
  locked: boolean;
  questionIndex: number;
  choice: number;
}

export interface QuestionRevealPayload {
  questionIndex: number;
  correctIndex: number;
  explanation: string;
  distribution: number[]; // count of answers for options [0..3]
  yourResult?: {
    correct: boolean;
    pointsAwarded: number;
    currentScore: number;
    currentStreak: number;
    rank: number;
    pointsToAbove: number;
  };
}

export interface LeaderboardUpdatePayload {
  topEntries: LeaderboardEntry[];
  yourRank?: LeaderboardEntry;
  questionIndex: number;
  totalQuestions: number;
}

export interface GameFinishedPayload {
  finalStandings: LeaderboardEntry[];
  podium: LeaderboardEntry[]; // top 3
  yourSummary?: {
    rank: number;
    totalScore: number;
    correctAnswers: number;
    totalQuestions: number;
    accuracyPct: number;
    stars: number;
  };
}

export interface RoomClosedPayload {
  reason: string;
}

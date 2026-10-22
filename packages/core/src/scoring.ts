import type { Organ } from './types.js';

/**
 * Calculates live game points per question according to specification:
 * streakBonus = Math.min(streak - 1, 4) * 50
 * points = correct ? 600 + Math.round(400 * remainingMs / limitMs) + streakBonus : 0
 */
export function calculatePoints(
  correct: boolean,
  remainingMs: number,
  limitMs: number,
  streak: number
): number {
  if (!correct) return 0;
  const safeRemaining = Math.max(0, Math.min(remainingMs, limitMs));
  const safeLimit = Math.max(1, limitMs);
  const streakBonus = Math.min(Math.max(0, streak - 1), 4) * 50;
  const timeScore = Math.round((400 * safeRemaining) / safeLimit);
  return 600 + timeScore + streakBonus;
}

/**
 * Converts a score out of total into 0 to 5 stars (retains original terminal game logic).
 */
export function calculateStars(score: number, total: number): number {
  if (total <= 0) return 0;
  const pct = Math.max(0, Math.min(1, score / total));
  return Math.round(pct * 5);
}

export interface ScoreSummary {
  score: number;
  total: number;
  pct: number;
  stars: number;
  message: string;
  themeColor: 'green' | 'gold' | 'red';
}

/**
 * Generates the terminal game's exact message and rating summary.
 */
export function getScoreSummary(score: number, total: number): ScoreSummary {
  const pct = total > 0 ? score / total : 0;
  const stars = calculateStars(score, total);
  let message = 'Keep practising - try Learn mode first.';
  let themeColor: 'green' | 'gold' | 'red' = 'red';

  if (pct >= 0.7) {
    message = 'Excellent! You know your Constitution.';
    themeColor = 'green';
  } else if (pct >= 0.4) {
    message = 'Good effort! Keep learning.';
    themeColor = 'gold';
  }

  return {
    score,
    total,
    pct,
    stars,
    message,
    themeColor,
  };
}

export interface LeaderboardEntry {
  playerId: string;
  nickname: string;
  score: number;
  totalTimeMs: number;
  rank: number;
  previousRank?: number;
  rankDelta?: number; // e.g. +1, 0, -2
  streak: number;
  isHost?: boolean;
}

/**
 * Sorts and ranks leaderboard: total points descending, then lower total response time, then nickname.
 */
export function rankLeaderboard(
  entries: Array<Omit<LeaderboardEntry, 'rank' | 'rankDelta'>>,
  previousRanks?: Map<string, number>
): LeaderboardEntry[] {
  const sorted = [...entries].sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    if (a.totalTimeMs !== b.totalTimeMs) {
      return a.totalTimeMs - b.totalTimeMs;
    }
    return a.nickname.localeCompare(b.nickname);
  });

  return sorted.map((entry, index) => {
    const rank = index + 1;
    const prev = previousRanks?.get(entry.playerId);
    const rankDelta = prev !== undefined ? prev - rank : 0;
    return {
      ...entry,
      rank,
      previousRank: prev,
      rankDelta,
    };
  });
}

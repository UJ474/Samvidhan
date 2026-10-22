import { describe, it, expect } from 'vitest';
import { calculatePoints, calculateStars, getScoreSummary, rankLeaderboard } from '../src/scoring.js';

describe('Scoring & Leaderboard Rules', () => {
  it('awards 0 points for incorrect answers', () => {
    expect(calculatePoints(false, 15000, 20000, 3)).toBe(0);
  });

  it('calculates live points with time bonus and streak bonus up to cap', () => {
    // 0 streak: bonus = 0. full time remaining (20s/20s) -> 600 + 400 + 0 = 1000
    expect(calculatePoints(true, 20000, 20000, 0)).toBe(1000);

    // streak 1: streak bonus = 0 (1-1)*50 = 0. half time remaining (10s/20s) -> 600 + 200 + 0 = 800
    expect(calculatePoints(true, 10000, 20000, 1)).toBe(800);

    // streak 3: streak bonus = (3-1)*50 = 100. full time remaining -> 600 + 400 + 100 = 1100
    expect(calculatePoints(true, 20000, 20000, 3)).toBe(1100);

    // streak 6: streak bonus capped at 4 * 50 = 200. zero time remaining -> 600 + 0 + 200 = 800
    expect(calculatePoints(true, 0, 20000, 6)).toBe(800);
  });

  it('calculates stars matching terminal game standards', () => {
    expect(calculateStars(10, 10)).toBe(5);
    expect(calculateStars(8, 10)).toBe(4);
    expect(calculateStars(5, 10)).toBe(3);
    expect(calculateStars(2, 10)).toBe(1);
    expect(calculateStars(0, 10)).toBe(0);
  });

  it('generates appropriate rating summaries', () => {
    const excellent = getScoreSummary(8, 10);
    expect(excellent.themeColor).toBe('green');
    expect(excellent.message).toContain('Excellent');

    const good = getScoreSummary(5, 10);
    expect(good.themeColor).toBe('gold');
    expect(good.message).toContain('Good effort');

    const needsPractice = getScoreSummary(3, 10);
    expect(needsPractice.themeColor).toBe('red');
    expect(needsPractice.message).toContain('Keep practising');
  });

  it('correctly ranks leaderboard by score, response time, then nickname', () => {
    const players = [
      { playerId: 'p1', nickname: 'Bhimrao', score: 2000, totalTimeMs: 4000, streak: 2 },
      { playerId: 'p2', nickname: 'Rajendra', score: 2500, totalTimeMs: 5000, streak: 3 },
      { playerId: 'p3', nickname: 'Sarojini', score: 2000, totalTimeMs: 3500, streak: 2 },
      { playerId: 'p4', nickname: 'Amrit', score: 2000, totalTimeMs: 4000, streak: 1 },
    ];

    const prevRanks = new Map([
      ['p1', 1],
      ['p2', 2],
    ]);

    const ranked = rankLeaderboard(players, prevRanks);

    // p2 has highest score (2500) -> Rank 1
    expect(ranked[0].playerId).toBe('p2');
    expect(ranked[0].rank).toBe(1);
    expect(ranked[0].rankDelta).toBe(1); // was 2, now 1 (+1)

    // p3 has 2000 score, lower time (3500) -> Rank 2
    expect(ranked[1].playerId).toBe('p3');
    expect(ranked[1].rank).toBe(2);

    // p4 and p1 both 2000 score, 4000 time. p4 ('Amrit') beats p1 ('Bhimrao') alphabetically -> Rank 3
    expect(ranked[2].playerId).toBe('p4');
    expect(ranked[2].rank).toBe(3);

    // p1 -> Rank 4
    expect(ranked[3].playerId).toBe('p1');
    expect(ranked[3].rank).toBe(4);
    expect(ranked[3].rankDelta).toBe(-3); // was 1, now 4 (-3)
  });
});

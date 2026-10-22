import type { Organ, SoloStats, Quiz } from '@samvidhan/core';

const STATS_KEY = 'samvidhan_stats_v1';
const BOOKMARKS_KEY = 'samvidhan_bookmarks_v1';
const QUIZZES_KEY = 'samvidhan_quizzes_v1';
const SETTINGS_KEY = 'samvidhan_settings_v1';

export interface AppSettings {
  sound: boolean;
  haptics: boolean;
  reduceMotion: boolean;
  theme: 'paper' | 'night';
}

const DEFAULT_STATS: SoloStats = {
  gamesPlayed: 0,
  quizzesCompleted: 0,
  wheelRoundsCompleted: 0,
  flashCardsReviewed: 0,
  snakesLaddersPlayed: 0,
  totalCorrect: 0,
  totalAnswered: 0,
  bestScore: 0,
  streakDays: 1,
  lastPlayedDate: new Date().toISOString().split('T')[0],
  accuracyByOrgan: {
    Legislature: { correct: 0, total: 0 },
    Executive: { correct: 0, total: 0 },
    Judiciary: { correct: 0, total: 0 },
  },
};

const DEFAULT_SETTINGS: AppSettings = {
  sound: true,
  haptics: true,
  reduceMotion: false,
  theme: 'paper',
};

export const storage = {
  getStats(): SoloStats {
    try {
      const data = localStorage.getItem(STATS_KEY);
      return data ? { ...DEFAULT_STATS, ...JSON.parse(data) } : DEFAULT_STATS;
    } catch {
      return DEFAULT_STATS;
    }
  },

  recordAnswer(organ: Organ, isCorrect: boolean): void {
    const stats = this.getStats();
    stats.totalAnswered += 1;
    if (isCorrect) stats.totalCorrect += 1;

    const organStats = stats.accuracyByOrgan[organ] || { correct: 0, total: 0 };
    organStats.total += 1;
    if (isCorrect) organStats.correct += 1;
    stats.accuracyByOrgan[organ] = organStats;

    // Check streak day
    const today = new Date().toISOString().split('T')[0];
    if (stats.lastPlayedDate !== today) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      if (stats.lastPlayedDate === yesterday) {
        stats.streakDays += 1;
      } else {
        stats.streakDays = 1;
      }
      stats.lastPlayedDate = today;
    }

    try {
      localStorage.setItem(STATS_KEY, JSON.stringify(stats));
    } catch {}
  },

  incrementMode(mode: 'quiz' | 'wheel' | 'flash' | 'snakes', score = 0): void {
    const stats = this.getStats();
    stats.gamesPlayed += 1;
    if (mode === 'quiz') stats.quizzesCompleted += 1;
    if (mode === 'wheel') stats.wheelRoundsCompleted += 1;
    if (mode === 'flash') stats.flashCardsReviewed += 1;
    if (mode === 'snakes') stats.snakesLaddersPlayed += 1;

    if (score > stats.bestScore) {
      stats.bestScore = score;
    }

    try {
      localStorage.setItem(STATS_KEY, JSON.stringify(stats));
    } catch {}
  },

  getBookmarks(): string[] {
    try {
      const data = localStorage.getItem(BOOKMARKS_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  toggleBookmark(articleId: string): boolean {
    const list = this.getBookmarks();
    const idx = list.indexOf(articleId);
    let bookmarked = false;
    if (idx >= 0) {
      list.splice(idx, 1);
      bookmarked = false;
    } else {
      list.push(articleId);
      bookmarked = true;
    }
    try {
      localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(list));
    } catch {}
    return bookmarked;
  },

  getSettings(): AppSettings {
    try {
      const data = localStorage.getItem(SETTINGS_KEY);
      return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  },

  updateSettings(partial: Partial<AppSettings>): AppSettings {
    const current = this.getSettings();
    const updated = { ...current, ...partial };
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
    } catch {}
    return updated;
  },
};

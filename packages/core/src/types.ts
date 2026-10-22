export type Organ = 'Legislature' | 'Executive' | 'Judiciary';

export interface Question {
  id: string;
  q: string;
  options: string[]; // 3 or 4 options (or 2 for boolean questions)
  answer: number;    // 0-based
  needsReview?: boolean;
}

export interface Article {
  id: string;            // e.g. 'art-56'
  article: string;       // e.g. '56', '74-75', '214 & 217'
  part: 'V' | 'VI';
  organ: Organ;
  title: string;
  simple: string;        // plain-language explanation
  questions: Question[]; // questions[0] is the primary question
}

export interface Quiz {
  id: string;
  title: string;
  mode: 'quiz' | 'wheel';
  questionIds: string[];
  custom: Question[];    // host-written extras
  secondsPerQuestion: number; // default 20
}

export interface SoloStats {
  gamesPlayed: number;
  quizzesCompleted: number;
  wheelRoundsCompleted: number;
  flashCardsReviewed: number;
  snakesLaddersPlayed: number;
  totalCorrect: number;
  totalAnswered: number;
  bestScore: number;
  streakDays: number;
  lastPlayedDate: string; // ISO date YYYY-MM-DD
  accuracyByOrgan: Record<Organ, { correct: number; total: number }>;
}

export interface Bookmark {
  articleId: string;
  bookmarkedAt: number;
}

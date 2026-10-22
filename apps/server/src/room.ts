import { Server } from 'socket.io';
import {
  calculatePoints,
  calculateStars,
  rankLeaderboard,
  planSpin,
  ORGANS,
  getArticlesByOrgan,
  getAllQuestions,
  type Organ,
  type Question,
  type Article,
  type Quiz,
  type LeaderboardEntry,
} from '@samvidhan/core';
import {
  SOCKET_EVENTS,
  type GameState,
  type PlayerPublic,
  type ClientQuestionPayload,
  type QuestionRevealPayload,
  type LeaderboardUpdatePayload,
  type GameFinishedPayload,
  type WheelSpinPayload,
} from '@samvidhan/protocol';

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateRoomCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

export function generateToken(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export interface Player {
  id: string;
  socketId: string;
  token: string;
  nickname: string;
  score: number;
  streak: number;
  totalTimeMs: number;
  isConnected: boolean;
  currentAnswer?: {
    choice: number;
    answeredAt: number;
    responseMs: number;
  };
}

export interface ActiveQuestionItem {
  article?: Article;
  question: Question;
  organ?: Organ;
}

export class GameRoom {
  public code: string;
  public hostToken: string;
  public hostSocketId: string;
  public quiz: Quiz;
  public state: GameState = 'LOBBY';
  public players = new Map<string, Player>();
  public currentQuestionIndex = -1;
  public questions: ActiveQuestionItem[] = [];
  public endsAt = 0;
  public questionTimer?: NodeJS.Timeout;
  public previousRanks = new Map<string, number>();
  public lastActiveAt = Date.now();
  public createdAt = Date.now();
  public currentSpin?: WheelSpinPayload;

  constructor(
    code: string,
    hostToken: string,
    hostSocketId: string,
    quiz: Quiz,
    public io: Server
  ) {
    this.code = code;
    this.hostToken = hostToken;
    this.hostSocketId = hostSocketId;
    this.quiz = quiz;
    this.prepareQuestions();
  }

  private prepareQuestions(): void {
    const all = getAllQuestions();
    const map = new Map(all.map((item) => [item.question.id, item]));

    if (this.quiz.mode === 'quiz') {
      const selected: ActiveQuestionItem[] = [];
      for (const qid of this.quiz.questionIds) {
        const found = map.get(qid);
        if (found) {
          selected.push({
            article: found.article,
            question: found.question,
            organ: found.article.organ,
          });
        }
      }
      for (const customQ of this.quiz.custom) {
        selected.push({ question: customQ });
      }
      // Fallback if empty: grab 10 random questions
      if (selected.length === 0) {
        const shuffled = [...all].sort(() => Math.random() - 0.5);
        for (const item of shuffled.slice(0, 10)) {
          selected.push({
            article: item.article,
            question: item.question,
            organ: item.article.organ,
          });
        }
      }
      this.questions = selected;
    }
  }

  public get roomChannel(): string {
    return `room:${this.code}`;
  }

  public addPlayer(nickname: string, socketId: string, existingToken?: string): Player {
    this.touch();

    // Check reconnect by token
    if (existingToken) {
      for (const [, player] of this.players) {
        if (player.token === existingToken) {
          player.socketId = socketId;
          player.isConnected = true;
          return player;
        }
      }
    }

    // Handle duplicate nicknames
    let finalNick = nickname.trim();
    let counter = 2;
    const existingNicks = new Set(Array.from(this.players.values()).map((p) => p.nickname.toLowerCase()));
    while (existingNicks.has(finalNick.toLowerCase())) {
      finalNick = `${nickname.trim()} ${counter++}`;
    }

    const playerId = `p_${Math.random().toString(36).substring(2, 9)}`;
    const token = generateToken();
    const player: Player = {
      id: playerId,
      socketId,
      token,
      nickname: finalNick,
      score: 0,
      streak: 0,
      totalTimeMs: 0,
      isConnected: true,
    };

    this.players.set(playerId, player);
    return player;
  }

  public removePlayer(playerId: string): void {
    this.touch();
    this.players.delete(playerId);
    this.broadcastLobbyUpdate();
  }

  public handleDisconnect(socketId: string): void {
    this.touch();
    for (const [, player] of this.players) {
      if (player.socketId === socketId) {
        player.isConnected = false;
        break;
      }
    }
    this.broadcastLobbyUpdate();
  }

  public broadcastLobbyUpdate(): void {
    const list: PlayerPublic[] = Array.from(this.players.values()).map((p) => ({
      id: p.id,
      nickname: p.nickname,
      score: p.score,
      streak: p.streak,
      isConnected: p.isConnected,
    }));

    this.io.to(this.roomChannel).emit(SOCKET_EVENTS.LOBBY_UPDATE, {
      players: list,
      playerCount: list.filter((p) => p.isConnected).length,
      quizTitle: this.quiz.title,
      mode: this.quiz.mode,
      totalQuestions: this.quiz.mode === 'wheel' ? 5 : this.questions.length,
    });
  }

  public startGame(): void {
    this.touch();
    if (this.quiz.mode === 'wheel') {
      this.startWheelRound();
    } else {
      this.nextQuestion();
    }
  }

  public startWheelRound(): void {
    this.touch();
    if (this.questionTimer) clearTimeout(this.questionTimer);

    this.currentQuestionIndex++;
    const totalRounds = 5;
    if (this.currentQuestionIndex >= totalRounds) {
      this.finishGame();
      return;
    }

    this.state = 'WHEEL';

    // Server picks the organ uniformly and generates a seed
    const organIndex = Math.floor(Math.random() * ORGANS.length);
    const chosenOrgan: Organ = ORGANS[organIndex];
    const seed = Math.floor(Math.random() * 1000000);
    const plan = planSpin(chosenOrgan, seed);

    this.currentSpin = {
      organ: chosenOrgan,
      seed,
      startsAt: Date.now(),
      durationMs: plan.durationMs,
      round: this.currentQuestionIndex + 1,
      totalRounds,
    };

    // Pick question from that organ
    const organArticles = getArticlesByOrgan(chosenOrgan);
    const article = organArticles[Math.floor(Math.random() * organArticles.length)];
    const question = article.questions[Math.floor(Math.random() * article.questions.length)];

    this.questions[this.currentQuestionIndex] = {
      article,
      question,
      organ: chosenOrgan,
    };

    // Broadcast synchronized spin to all devices
    this.io.to(this.roomChannel).emit(SOCKET_EVENTS.WHEEL_SPIN, this.currentSpin);

    // After wheel landing duration + 1000ms pause, show the question
    this.questionTimer = setTimeout(() => {
      this.showCurrentQuestion();
    }, plan.durationMs + 1000);
  }

  public nextQuestion(): void {
    this.touch();
    if (this.questionTimer) clearTimeout(this.questionTimer);

    this.currentQuestionIndex++;
    if (this.currentQuestionIndex >= this.questions.length) {
      this.finishGame();
      return;
    }

    this.showCurrentQuestion();
  }

  private showCurrentQuestion(): void {
    this.state = 'QUESTION';
    const current = this.questions[this.currentQuestionIndex];
    if (!current) return;

    // Reset current round answers
    for (const [, player] of this.players) {
      delete player.currentAnswer;
    }

    const durationMs = this.quiz.secondsPerQuestion * 1000;
    const now = Date.now();
    this.endsAt = now + durationMs;

    // Anti-cheat: strip correct answer & explanation
    const clientPayload: ClientQuestionPayload = {
      index: this.currentQuestionIndex,
      total: this.quiz.mode === 'wheel' ? 5 : this.questions.length,
      text: current.question.q,
      options: current.question.options,
      endsAt: this.endsAt,
      serverNow: now,
      organ: current.organ || current.article?.organ,
      articleNumber: current.article?.article,
      answeredCount: 0,
      totalPlayers: Array.from(this.players.values()).filter((p) => p.isConnected).length,
    };

    this.io.to(this.roomChannel).emit(SOCKET_EVENTS.QUESTION_SHOW, clientPayload);

    // Timeout when timer runs out
    this.questionTimer = setTimeout(() => {
      this.revealAnswer();
    }, durationMs + 200); // 200ms grace period for network jitter
  }

  public submitAnswer(playerId: string, questionIndex: number, choice: number): boolean {
    this.touch();
    if (this.state !== 'QUESTION' || questionIndex !== this.currentQuestionIndex) {
      return false;
    }

    const player = this.players.get(playerId);
    if (!player || player.currentAnswer !== undefined) {
      return false; // already locked
    }

    const now = Date.now();
    const limitMs = this.quiz.secondsPerQuestion * 1000;
    const startMs = this.endsAt - limitMs;
    const responseMs = Math.max(0, now - startMs);

    player.currentAnswer = {
      choice,
      answeredAt: now,
      responseMs,
    };

    // Ack to player
    this.io.to(player.socketId).emit(SOCKET_EVENTS.ANSWER_ACK, {
      locked: true,
      questionIndex,
      choice,
    });

    // Notify host/room about answer count progress
    const answeredCount = Array.from(this.players.values()).filter((p) => p.currentAnswer !== undefined).length;
    const connectedCount = Array.from(this.players.values()).filter((p) => p.isConnected).length;

    // If all connected players have answered, reveal early!
    if (connectedCount > 0 && answeredCount >= connectedCount) {
      if (this.questionTimer) clearTimeout(this.questionTimer);
      // Brief 400ms pause to let user see locked state
      this.questionTimer = setTimeout(() => {
        this.revealAnswer();
      }, 400);
    }

    return true;
  }

  private getLeaderboardCandidates() {
    return Array.from(this.players.values()).map((p) => ({
      playerId: p.id,
      nickname: p.nickname,
      score: p.score,
      totalTimeMs: p.totalTimeMs,
      streak: p.streak,
    }));
  }

  public revealAnswer(): void {
    this.touch();
    if (this.questionTimer) clearTimeout(this.questionTimer);
    this.state = 'REVEAL';

    const current = this.questions[this.currentQuestionIndex];
    if (!current) return;

    const correctIndex = current.question.answer;
    const distribution = [0, 0, 0, 0];
    const limitMs = this.quiz.secondsPerQuestion * 1000;
    const now = Date.now();

    // Score answers
    for (const [, player] of this.players) {
      if (player.currentAnswer) {
        distribution[player.currentAnswer.choice] = (distribution[player.currentAnswer.choice] || 0) + 1;
        const isCorrect = player.currentAnswer.choice === correctIndex;
        if (isCorrect) {
          player.streak += 1;
          const remainingMs = Math.max(0, this.endsAt - player.currentAnswer.answeredAt);
          const pts = calculatePoints(true, remainingMs, limitMs, player.streak);
          player.score += pts;
        } else {
          player.streak = 0;
        }
        player.totalTimeMs += player.currentAnswer.responseMs;
      } else {
        // Did not answer
        player.streak = 0;
        player.totalTimeMs += limitMs;
      }
    }

    // Compute updated leaderboard
    const ranked = rankLeaderboard(this.getLeaderboardCandidates(), this.previousRanks);

    // Send reveal with personalized result to each player
    for (const player of this.players.values()) {
      const myRankEntry = ranked.find((r) => r.playerId === player.id);
      const isCorrect = player.currentAnswer?.choice === correctIndex;
      const pointsAwarded = isCorrect
        ? calculatePoints(
            true,
            Math.max(0, this.endsAt - (player.currentAnswer?.answeredAt || now)),
            limitMs,
            player.streak
          )
        : 0;

      const playerIndex = ranked.findIndex((r) => r.playerId === player.id);
      const pointsToAbove = playerIndex > 0 ? ranked[playerIndex - 1].score - player.score : 0;

      const payload: QuestionRevealPayload = {
        questionIndex: this.currentQuestionIndex,
        correctIndex,
        explanation: current.article?.simple || 'Constitution of India',
        distribution,
        yourResult: {
          correct: isCorrect,
          pointsAwarded,
          currentScore: player.score,
          currentStreak: player.streak,
          rank: myRankEntry ? myRankEntry.rank : ranked.length,
          pointsToAbove,
        },
      };

      this.io.to(player.socketId).emit(SOCKET_EVENTS.QUESTION_REVEAL, payload);
    }

    // Host receives reveal payload
    this.io.to(this.hostSocketId).emit(SOCKET_EVENTS.QUESTION_REVEAL, {
      questionIndex: this.currentQuestionIndex,
      correctIndex,
      explanation: current.article?.simple || 'Constitution of India',
      distribution,
    });
  }

  public showLeaderboard(): void {
    this.touch();
    this.state = 'LEADERBOARD';

    const ranked = rankLeaderboard(this.getLeaderboardCandidates(), this.previousRanks);
    // Update previous ranks for next delta
    for (const r of ranked) {
      this.previousRanks.set(r.playerId, r.rank);
    }

    const topEntries = ranked.slice(0, 10);
    const totalCount = this.quiz.mode === 'wheel' ? 5 : this.questions.length;

    for (const player of this.players.values()) {
      const myRank = ranked.find((r) => r.playerId === player.id);
      const payload: LeaderboardUpdatePayload = {
        topEntries,
        yourRank: myRank,
        questionIndex: this.currentQuestionIndex,
        totalQuestions: totalCount,
      };
      this.io.to(player.socketId).emit(SOCKET_EVENTS.LEADERBOARD_UPDATE, payload);
    }

    this.io.to(this.hostSocketId).emit(SOCKET_EVENTS.LEADERBOARD_UPDATE, {
      topEntries,
      questionIndex: this.currentQuestionIndex,
      totalQuestions: totalCount,
    });
  }

  public finishGame(): void {
    this.touch();
    if (this.questionTimer) clearTimeout(this.questionTimer);
    this.state = 'FINISHED';

    const ranked = rankLeaderboard(this.getLeaderboardCandidates(), this.previousRanks);
    const podium = ranked.slice(0, 3);
    const totalCount = this.quiz.mode === 'wheel' ? 5 : this.questions.length;

    for (const player of this.players.values()) {
      const myRank = ranked.find((r) => r.playerId === player.id);
      const stars = calculateStars(player.score, totalCount * 1000);
      const payload: GameFinishedPayload = {
        finalStandings: ranked,
        podium,
        yourSummary: myRank
          ? {
              rank: myRank.rank,
              totalScore: player.score,
              correctAnswers: 0,
              totalQuestions: totalCount,
              accuracyPct: 0,
              stars,
            }
          : undefined,
      };
      this.io.to(player.socketId).emit(SOCKET_EVENTS.GAME_FINISHED, payload);
    }

    this.io.to(this.hostSocketId).emit(SOCKET_EVENTS.GAME_FINISHED, {
      finalStandings: ranked,
      podium,
    });
  }

  public advance(): void {
    this.touch();
    if (this.state === 'LOBBY') {
      this.startGame();
    } else if (this.state === 'REVEAL') {
      this.showLeaderboard();
    } else if (this.state === 'LEADERBOARD') {
      const totalCount = this.quiz.mode === 'wheel' ? 5 : this.questions.length;
      if (this.currentQuestionIndex + 1 >= totalCount) {
        this.finishGame();
      } else if (this.quiz.mode === 'wheel') {
        this.startWheelRound();
      } else {
        this.nextQuestion();
      }
    }
  }

  public skip(): void {
    this.touch();
    if (this.state === 'QUESTION') {
      this.revealAnswer();
    } else if (this.state === 'WHEEL') {
      if (this.questionTimer) clearTimeout(this.questionTimer);
      this.showCurrentQuestion();
    }
  }

  public touch(): void {
    this.lastActiveAt = Date.now();
  }
}

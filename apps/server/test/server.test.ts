import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { io as ioc, type Socket as ClientSocket } from 'socket.io-client';
import { createServer } from '../src/server.js';
import { SOCKET_EVENTS } from '@samvidhan/protocol';
import type { Quiz } from '@samvidhan/core';

describe('Server & Multiplayer Game Integration', () => {
  let app: any;
  let serverPort: number;
  let hostSocket: ClientSocket;
  let playerSocket1: ClientSocket;
  let playerSocket2: ClientSocket;
  let serverUrl: string;

  const testQuiz: Quiz = {
    id: 'test-quiz',
    title: 'Test Constitution Quiz',
    mode: 'quiz',
    questionIds: ['art-52-q1', 'art-54-q1'],
    custom: [],
    secondsPerQuestion: 15,
  };

  beforeAll(async () => {
    const s = await createServer();
    app = s.app;
    await app.listen({ port: 0, host: '127.0.0.1' });
    serverPort = app.server.address().port;
    serverUrl = `http://127.0.0.1:${serverPort}`;
  });

  afterAll(async () => {
    if (hostSocket?.connected) hostSocket.disconnect();
    if (playerSocket1?.connected) playerSocket1.disconnect();
    if (playerSocket2?.connected) playerSocket2.disconnect();
    await app.close();
  });

  it('runs health check endpoint', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/healthz',
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.status).toBe('ok');
  });

  it('handles room create, player join, anti-cheat question emission, and answer reveal', async () => {
    let roomCode = '';

    // 1. Host creates room
    hostSocket = ioc(serverUrl);
    const roomCreatedPromise = new Promise<any>((resolve) => {
      hostSocket.on(SOCKET_EVENTS.ROOM_CREATED, resolve);
    });

    hostSocket.emit(SOCKET_EVENTS.ROOM_CREATE, {
      quiz: testQuiz,
      hostName: 'TestHost',
    });

    const roomCreated = await roomCreatedPromise;
    expect(roomCreated.code).toBeDefined();
    expect(roomCreated.code.length).toBe(6);
    roomCode = roomCreated.code;

    // 2. Players join room
    playerSocket1 = ioc(serverUrl);
    playerSocket2 = ioc(serverUrl);

    const joinP1 = new Promise<any>((resolve) => {
      playerSocket1.on(SOCKET_EVENTS.ROOM_JOINED, resolve);
    });
    const joinP2 = new Promise<any>((resolve) => {
      playerSocket2.on(SOCKET_EVENTS.ROOM_JOINED, resolve);
    });

    playerSocket1.emit(SOCKET_EVENTS.ROOM_JOIN, {
      code: roomCode,
      nickname: 'Bhimrao',
    });
    playerSocket2.emit(SOCKET_EVENTS.ROOM_JOIN, {
      code: roomCode,
      nickname: 'Rajendra',
    });

    const [p1, p2] = await Promise.all([joinP1, joinP2]);
    expect(p1.nickname).toBe('Bhimrao');
    expect(p2.nickname).toBe('Rajendra');

    // 3. Start game and verify question emission is stripped (NO answer leaked)
    const questionPromise = new Promise<any>((resolve) => {
      playerSocket1.on(SOCKET_EVENTS.QUESTION_SHOW, resolve);
    });

    hostSocket.emit(SOCKET_EVENTS.GAME_START);

    const questionPayload = await questionPromise;
    expect(questionPayload.text).toBeDefined();
    expect(questionPayload.options.length).toBeGreaterThanOrEqual(2);
    // CRITICAL: verify anti-cheat
    expect((questionPayload as any).answer).toBeUndefined();
    expect((questionPayload as any).explanation).toBeUndefined();

    // 4. Players submit answers
    const ackPromise1 = new Promise<any>((resolve) => {
      playerSocket1.on(SOCKET_EVENTS.ANSWER_ACK, resolve);
    });

    // Option 1 is correct for art-52-q1 ('President')
    playerSocket1.emit(SOCKET_EVENTS.ANSWER_SUBMIT, {
      questionIndex: questionPayload.index,
      choice: 1,
    });
    playerSocket2.emit(SOCKET_EVENTS.ANSWER_SUBMIT, {
      questionIndex: questionPayload.index,
      choice: 0,
    });

    const ack = await ackPromise1;
    expect(ack.locked).toBe(true);

    // 5. Verify reveal payload arrives
    const revealPromise = new Promise<any>((resolve) => {
      playerSocket1.on(SOCKET_EVENTS.QUESTION_REVEAL, resolve);
    });

    const reveal = await revealPromise;
    expect(reveal.correctIndex).toBe(1);
    expect(reveal.yourResult).toBeDefined();
    expect(reveal.yourResult.correct).toBe(true);
    expect(reveal.yourResult.pointsAwarded).toBeGreaterThan(600);
  });
});

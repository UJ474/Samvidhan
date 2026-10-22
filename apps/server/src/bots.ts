import { io as socketIOClient } from 'socket.io-client';
import { SOCKET_EVENTS } from '@samvidhan/protocol';

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3001';
const ROOM_CODE = process.argv[2];
const BOT_COUNT = parseInt(process.argv[3] || '10', 10);

if (!ROOM_CODE) {
  console.log('Usage: pnpm --filter @samvidhan/server bots <ROOM_CODE> [BOT_COUNT]');
  process.exit(1);
}

console.log(`🤖 Spawning ${BOT_COUNT} bots into room [${ROOM_CODE}] targeting ${SERVER_URL}...`);

const NAMES = [
  'Babasaheb', 'Rajendra', 'Nehru', 'Patel', 'Sarojini',
  'Amrit Kaur', 'Maulana', 'Munshi', 'Alladi', 'B.N. Rau',
  'Kamla', 'Hansa', 'Durgabai', 'Sucheta', 'Dakshayani',
  'Purnima', 'Malati', 'Renuka', 'Leela', 'Annie'
];

for (let i = 0; i < BOT_COUNT; i++) {
  const nickname = `${NAMES[i % NAMES.length]}_Bot${i + 1}`;
  const socket = socketIOClient(SERVER_URL);

  socket.on('connect', () => {
    socket.emit(SOCKET_EVENTS.ROOM_JOIN, {
      code: ROOM_CODE,
      nickname,
    });
  });

  socket.on(SOCKET_EVENTS.ROOM_JOINED, (data: any) => {
    console.log(`[Bot ${i + 1}] Joined as ${data.nickname}`);
  });

  socket.on(SOCKET_EVENTS.QUESTION_SHOW, (payload: any) => {
    // Random delay between 1 and 6 seconds
    const delayMs = 1000 + Math.floor(Math.random() * 5000);
    const choice = Math.floor(Math.random() * payload.options.length);

    setTimeout(() => {
      socket.emit(SOCKET_EVENTS.ANSWER_SUBMIT, {
        questionIndex: payload.index,
        choice,
      });
    }, delayMs);
  });

  socket.on(SOCKET_EVENTS.QUESTION_REVEAL, (payload: any) => {
    if (payload.yourResult) {
      // console.log(`[Bot ${i + 1}] Result: ${payload.yourResult.correct ? '✔' : '✘'} (+${payload.yourResult.pointsAwarded} pts)`);
    }
  });

  socket.on(SOCKET_EVENTS.GAME_FINISHED, () => {
    console.log(`[Bot ${i + 1}] Game completed.`);
    socket.disconnect();
  });
}

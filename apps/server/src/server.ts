import fastify from 'fastify';
import cors from '@fastify/cors';
import { Server as SocketIOServer } from 'socket.io';
import {
  SOCKET_EVENTS,
  RoomCreatePayloadSchema,
  RoomJoinPayloadSchema,
  AnswerSubmitPayloadSchema,
} from '@samvidhan/protocol';
import { GameRoom, generateRoomCode, generateToken } from './room.js';

export async function createServer() {
  const app = fastify({ logger: false });

  await app.register(cors, {
    origin: '*',
    methods: ['GET', 'POST'],
  });

  app.get('/healthz', async () => {
    return {
      status: 'ok',
      uptime: process.uptime(),
      activeRooms: rooms.size,
      time: new Date().toISOString(),
    };
  });

  const io = new SocketIOServer(app.server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    pingInterval: 10000,
    pingTimeout: 5000,
  });

  const rooms = new Map<string, GameRoom>();
  const socketToRoom = new Map<string, { code: string; playerId?: string; isHost?: boolean }>();

  // Periodically clean up rooms idle for > 4 hours
  setInterval(() => {
    const now = Date.now();
    const FOUR_HOURS = 4 * 60 * 60 * 1000;
    for (const [code, room] of rooms) {
      if (now - room.lastActiveAt > FOUR_HOURS) {
        room.io.to(room.roomChannel).emit(SOCKET_EVENTS.ROOM_CLOSED, {
          reason: 'Room expired due to inactivity',
        });
        rooms.delete(code);
      }
    }
  }, 10 * 60 * 1000);

  io.on('connection', (socket) => {
    // ----------------- Create Room (Host) -----------------
    socket.on(SOCKET_EVENTS.ROOM_CREATE, (data: unknown) => {
      try {
        const parsed = RoomCreatePayloadSchema.parse(data);
        let code = generateRoomCode();
        while (rooms.has(code)) {
          code = generateRoomCode();
        }

        const hostToken = generateToken();
        const room = new GameRoom(code, hostToken, socket.id, parsed.quiz, io);
        rooms.set(code, room);

        socket.join(room.roomChannel);
        socketToRoom.set(socket.id, { code, isHost: true });

        socket.emit(SOCKET_EVENTS.ROOM_CREATED, {
          code,
          hostToken,
          joinUrl: `/join/${code}`,
          roomState: room.state,
          quiz: room.quiz,
        });

        room.broadcastLobbyUpdate();
      } catch (err: any) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: err?.message || 'Invalid room creation data' });
      }
    });

    // ----------------- Join Room (Player) -----------------
    socket.on(SOCKET_EVENTS.ROOM_JOIN, (data: unknown) => {
      try {
        const parsed = RoomJoinPayloadSchema.parse(data);
        const room = rooms.get(parsed.code);

        if (!room) {
          socket.emit(SOCKET_EVENTS.ERROR, { message: `Room ${parsed.code} not found.` });
          return;
        }

        if (room.state === 'FINISHED') {
          socket.emit(SOCKET_EVENTS.ERROR, { message: 'This game has already finished.' });
          return;
        }

        const player = room.addPlayer(parsed.nickname, socket.id, parsed.playerToken);
        socket.join(room.roomChannel);
        socketToRoom.set(socket.id, { code: room.code, playerId: player.id });

        socket.emit(SOCKET_EVENTS.ROOM_JOINED, {
          playerId: player.id,
          playerToken: player.token,
          nickname: player.nickname,
          code: room.code,
          roomState: room.state,
          quizTitle: room.quiz.title,
          mode: room.quiz.mode,
        });

        room.broadcastLobbyUpdate();
      } catch (err: any) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: err?.message || 'Invalid join data' });
      }
    });

    // ----------------- Start Game (Host) -----------------
    socket.on(SOCKET_EVENTS.GAME_START, () => {
      const binding = socketToRoom.get(socket.id);
      if (!binding || !binding.isHost) return;
      const room = rooms.get(binding.code);
      if (room && room.state === 'LOBBY') {
        room.startGame();
      }
    });

    // ----------------- Submit Answer (Player) -----------------
    socket.on(SOCKET_EVENTS.ANSWER_SUBMIT, (data: unknown) => {
      const binding = socketToRoom.get(socket.id);
      if (!binding || !binding.playerId) return;

      try {
        const parsed = AnswerSubmitPayloadSchema.parse(data);
        const room = rooms.get(binding.code);
        if (room) {
          room.submitAnswer(binding.playerId, parsed.questionIndex, parsed.choice);
        }
      } catch (err: any) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: 'Invalid answer payload' });
      }
    });

    // ----------------- Host Controls -----------------
    socket.on(SOCKET_EVENTS.HOST_NEXT, () => {
      const binding = socketToRoom.get(socket.id);
      if (!binding || !binding.isHost) return;
      const room = rooms.get(binding.code);
      if (room) {
        room.advance();
      }
    });

    socket.on(SOCKET_EVENTS.HOST_SKIP, () => {
      const binding = socketToRoom.get(socket.id);
      if (!binding || !binding.isHost) return;
      const room = rooms.get(binding.code);
      if (room) {
        room.skip();
      }
    });

    socket.on(SOCKET_EVENTS.HOST_REMOVE_PLAYER, (playerId: string) => {
      const binding = socketToRoom.get(socket.id);
      if (!binding || !binding.isHost) return;
      const room = rooms.get(binding.code);
      if (room && typeof playerId === 'string') {
        room.removePlayer(playerId);
      }
    });

    socket.on(SOCKET_EVENTS.HOST_END, () => {
      const binding = socketToRoom.get(socket.id);
      if (!binding || !binding.isHost) return;
      const room = rooms.get(binding.code);
      if (room) {
        room.finishGame();
      }
    });

    // ----------------- Disconnect -----------------
    socket.on('disconnect', () => {
      const binding = socketToRoom.get(socket.id);
      if (binding) {
        const room = rooms.get(binding.code);
        if (room) {
          if (binding.isHost) {
            // Host disconnected (can reconnect via host token)
            room.touch();
          } else {
            room.handleDisconnect(socket.id);
          }
        }
        socketToRoom.delete(socket.id);
      }
    });
  });

  return { app, io, rooms };
}

// Start standalone if executed directly
if (process.env.NODE_ENV !== 'test') {
  const PORT = Number(process.env.PORT) || 3001;
  const HOST = process.env.HOST || '0.0.0.0';

  createServer()
    .then(({ app }) => {
      app.listen({ port: PORT, host: HOST }, (err, address) => {
        if (err) {
          console.error('Failed to start server:', err);
          process.exit(1);
        }
        console.log(`\x1b[32m✔ Samvidhan Server listening on ${address}\x1b[0m`);
      });
    })
    .catch((err) => {
      console.error('Fatal server startup error:', err);
      process.exit(1);
    });
}

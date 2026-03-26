import express, { type Request, type Response } from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { JSDOM } from 'jsdom';
import DOMPurify from 'dompurify';
import path from 'path';
import { fileURLToPath } from 'url';
import { RoomManager } from './RoomManager.js';
import { executePhase, nextTurn } from './GameEngine.js';
import { sanitizeChatMessage } from './utils.js';
import { aiPlayerManager } from './AIPlayerManager.js';
import {
  CreateRoomSchema,
  JoinRoomSchema,
  ProgramDataSchema,
  ChatMessageSchema,
} from './types.js';
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  GameUpdate,
  Room,
} from '@roborally/shared';
import { GamePhase, PhaseStep, CardType, Difficulty } from '@roborally/shared';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env['PORT'] || 3001;
const NODE_ENV = process.env['NODE_ENV'] || 'development';

const window = new JSDOM('').window;
const purify = DOMPurify(window);

const app = express();
const httpServer = createServer(app);

const io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: NODE_ENV === 'production' ? false : ['http://localhost:5173', 'http://localhost:3000'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
});

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip || 'unknown',
});

app.use(cors({
  origin: NODE_ENV === 'production' ? false : ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}));

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", "ws:", "wss:"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      fontSrc: ["'self'"],
    },
  },
}));
app.use(limiter);
app.use(express.json({ limit: '10kb' }));

const roomManager = new RoomManager();

function serializeRoom(room: ReturnType<RoomManager['getRoom']>): GameUpdate | null {
  if (!room) return null;

  const players = Array.from(room.players.values()).map(p => ({
    ...p,
    robot: p.robot ? { ...p.robot } : null,
  }));

  return {
    room: {
      ...room,
      players: new Map(),
      board: room.board,
    },
    players,
    chat: roomManager.getChatHistory(room.id),
  };
}

io.on('connection', (socket: Socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on('room:create', (data: unknown, callback: (result: { success: boolean; roomCode?: string; error?: string }) => void) => {
    console.log('room:create received data:', data);
    try {
      const validated = CreateRoomSchema.parse(data);
      console.log('room:create validated:', validated);
      const room = roomManager.createRoom(
        socket.id,
        socket.id,
        validated
      );
      console.log('room:create room created:', room?.id);

      const player = roomManager.addPlayer(
        room.id,
        socket.id,
        'Host',
        'tank',
        '#FF4444'
      );
      console.log('room:create player result:', !!player);

      if (!player) {
        callback({ success: false, error: 'Failed to join room' });
        return;
      }

      socket.join(room.id);
      console.log('room:create callback:', { success: true, roomCode: room.code });
      callback({ success: true, roomCode: room.code });

      const update = serializeRoom(room);
      if (update) {
        io.to(room.id).emit('room:update', update);
      }
    } catch (error) {
      console.error('room:create error:', error);
      if (error instanceof Error) {
        callback({ success: false, error: error.message });
      } else {
        callback({ success: false, error: 'Invalid data' });
      }
    }
  });

  socket.on('room:join', (data: unknown, callback: (result: { success: boolean; room?: GameUpdate; error?: string }) => void) => {
    try {
      const validated = JoinRoomSchema.parse(data);
      const room = roomManager.getRoomByCode(validated.code);

      if (!room) {
        callback({ success: false, error: 'Room not found' });
        return;
      }

      const player = roomManager.addPlayer(
        room.id,
        socket.id,
        validated.playerName,
        validated.playerAvatar,
        validated.playerColor
      );

      if (!player) {
        callback({ success: false, error: 'Room is full or game already started' });
        return;
      }

      socket.join(room.id);
      callback({ success: true, room: serializeRoom(room)! });

      const update = serializeRoom(room);
      if (update) {
        io.to(room.id).emit('room:update', update);
      }
    } catch (error) {
      if (error instanceof Error) {
        callback({ success: false, error: error.message });
      } else {
        callback({ success: false, error: 'Invalid data' });
      }
    }
  });

  socket.on('room:leave', () => {
    const room = roomManager.removePlayer(socket.id);
    if (room) {
      const update = serializeRoom(room);
      if (update) {
        io.to(room.id).emit('room:update', update);
      }
    }
    socket.leave(socket.id);
  });

  socket.on('room:ready', (isReady: boolean, callback: (result: { success: boolean }) => void) => {
    const room = roomManager.setPlayerReady(socket.id, isReady);
    if (room) {
      const update = serializeRoom(room);
      if (update) {
        io.to(room.id).emit('room:update', update);
      }
    }
    callback({ success: true });
  });

  socket.on('room:start', (callback: (result: { success: boolean; error?: string }) => void) => {
    const room = roomManager.startGame(socket.id);
    if (room) {
      io.to(room.id).emit('game:started');
      const update = serializeRoom(room);
      if (update) {
        io.to(room.id).emit('room:update', update);
      }
      callback({ success: true });
    } else {
      callback({ success: false, error: 'Cannot start game' });
    }
  });

  socket.on('room:addBot', (data: { difficulty: Difficulty }, callback: (result: { success: boolean; error?: string }) => void) => {
    const room = roomManager.getPlayerRoom(socket.id);
    if (!room) {
      callback({ success: false, error: 'Not in a room' });
      return;
    }

    const player = room.players.get(socket.id);
    if (!player?.isHost) {
      callback({ success: false, error: 'Only host can add bots' });
      return;
    }

    if (room.players.size >= room.maxPlayers) {
      callback({ success: false, error: 'Room is full' });
      return;
    }

    const aiName = aiPlayerManager.generateAIName();
    if (!aiName) {
      callback({ success: false, error: 'No AI names available' });
      return;
    }

    const colors = ['#FF4444', '#44FF44', '#4444FF', '#FFFF44', '#FF44FF', '#44FFFF', '#FFAA00', '#AAFF00'];
    const avatars = ['tank', 'wheelbot', 'flybot', 'hovercraft', 'rollerbot'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const randomAvatar = avatars[Math.floor(Math.random() * avatars.length)];

    const bot = roomManager.addAIPlayer(
      room.id,
      aiName!,
      randomAvatar!,
      randomColor!,
      data.difficulty
    );

    if (bot) {
      const update = serializeRoom(room);
      if (update) {
        io.to(room.id).emit('room:update', update);
      }
      callback({ success: true });
    } else {
      callback({ success: false, error: 'Failed to add bot' });
    }
  });

  socket.on('room:removeBot', (data: { playerId: string }, callback: (result: { success: boolean; error?: string }) => void) => {
    const room = roomManager.getPlayerRoom(socket.id);
    if (!room) {
      callback({ success: false, error: 'Not in a room' });
      return;
    }

    const player = room.players.get(socket.id);
    if (!player?.isHost) {
      callback({ success: false, error: 'Only host can remove bots' });
      return;
    }

    const targetPlayer = room.players.get(data.playerId);
    if (!targetPlayer?.isAI) {
      callback({ success: false, error: 'Player is not a bot' });
      return;
    }

    roomManager.removeAIPlayer(room.id, data.playerId);

    const update = serializeRoom(room);
    if (update) {
      io.to(room.id).emit('room:update', update);
    }
    callback({ success: true });
  });

  socket.on('game:program', (data: unknown) => {
    try {
      const validated = ProgramDataSchema.parse(data);
      const registers = validated.registers.map(r => r ? { id: r.id, type: r.type as CardType, priority: r.priority } : null);
      const room = roomManager.submitProgram(socket.id, registers, validated.powerDown);

      if (room) {
        const allProgrammed = Array.from(room.players.values()).every(
          p => p.registers.every(r => r !== null) || (p.robot?.powerDown ?? false)
        );

        if (allProgrammed && room.gameState.phase === GamePhase.PROGRAMMING) {
          room.gameState.phase = GamePhase.RESOLUTION;
          startPhaseResolution(room);
        }

        const update = serializeRoom(room);
        if (update) {
          io.to(room.id).emit('room:update', update);
        }
      }
    } catch (error) {
      socket.emit('error', 'Invalid program data');
    }
  });

  socket.on('chat:send', (message: unknown) => {
    try {
      const validated = ChatMessageSchema.parse({ message });
      const room = roomManager.getPlayerRoom(socket.id);

      if (!room) return;

      const player = room.players.get(socket.id);
      if (!player) return;

      const cleanMessage = purify.sanitize(validated.message);
      const sanitized = sanitizeChatMessage(cleanMessage);

      const chatMsg = roomManager.addChatMessage(
        room.id,
        player.id,
        player.name,
        player.color,
        sanitized
      );

      if (chatMsg) {
        io.to(room.id).emit('chat:message', chatMsg);
      }
    } catch (error) {
      socket.emit('error', 'Invalid chat message');
    }
  });

  socket.on('player:ping', () => {
    roomManager.updatePlayerActivity(socket.id);
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
    const room = roomManager.removePlayer(socket.id);
    if (room) {
      const update = serializeRoom(room);
      if (update) {
        io.to(room.id).emit('room:update', update);
      }
    }
  });

  // AI turn processing function - called when game starts or during programming phase
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function processAITurns(room: ReturnType<RoomManager['getRoom']>): void {
  if (!room) return;

  const aiPlayers = Array.from(room.players.values()).filter(p => p.isAI);

  for (const player of aiPlayers) {
    if (!player.robot?.powerDown) {
      const aiRegisters = roomManager.getAIProgram(player, room);
      roomManager.submitProgram(player.socketId, aiRegisters, false);
    }
  }

  // Check if all players have programmed
  const allProgrammed = Array.from(room.players.values()).every(
    p => p.registers.every(r => r !== null) || (p.robot?.powerDown ?? false)
  );

  if (allProgrammed && room.gameState.phase === GamePhase.PROGRAMMING) {
    room.gameState.phase = GamePhase.RESOLUTION;
    startPhaseResolution(room);
  }

  const update = serializeRoom(room);
  if (update) {
    io.to(room.id).emit('room:update', update);
  }
}
});

function startPhaseResolution(room: Room): void {
  if (!room) return;

  let currentRegister = 0;

  const runNextPhase = () => {
    if (!room) return;
    if (currentRegister >= 5) {
      nextTurn(room);
      const update = serializeRoom(room);
      if (update) {
        io.to(room.id).emit('room:update', update);
      }
      return;
    }

    currentRegister++;
    room.gameState.currentRegister = currentRegister;
    io.to(room.id).emit('game:phase', GamePhase.RESOLUTION, currentRegister);

    const phaseSteps = [
      PhaseStep.REVEAL_CARDS,
      PhaseStep.MOVE_ROBOTS,
      PhaseStep.BOARD_ELEMENTS,
      PhaseStep.LASERS,
      PhaseStep.TOUCH_CHECKPOINTS,
      PhaseStep.CLEANUP,
    ];

    let stepIndex = 0;

    const runStep = () => {
      if (!room) return;
      if (stepIndex >= phaseSteps.length) {
        setTimeout(runNextPhase, 1000);
        return;
      }

      const step = phaseSteps[stepIndex]!;
      io.to(room.id).emit('game:phaseUpdate', step, 0);

      if (step === PhaseStep.MOVE_ROBOTS) {
        executePhase(room, currentRegister);
      }

      let progress = 0;
      const progressInterval = setInterval(() => {
        progress += 10;
        io.to(room.id).emit('game:phaseUpdate', step, progress);

        if (progress >= 100) {
          clearInterval(progressInterval);
          stepIndex++;
          setTimeout(runStep, 200);
        }
      }, 100);
    };

    setTimeout(runStep, 500);
  };

  runNextPhase();
}

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// Serve static files from client dist
const clientDistPath = path.join(__dirname, '../../client/dist');
app.use(express.static(clientDistPath));

// API routes above the catch-all
app.get('/', (_req: Request, res: Response) => {
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

// Catch-all route to serve index.html for client-side routing
app.get('*', (_req: Request, res: Response) => {
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${NODE_ENV}`);
});

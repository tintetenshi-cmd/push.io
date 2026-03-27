import { Room, Player, ChatMessage, GameState, Cell, Position } from '@roborally/shared';
import {
  GamePhase,
  Direction,
  CellType,
  CardType,
  CARD_PROBABILITIES,
  Difficulty,
} from '@roborally/shared';
import { v4 as uuidv4 } from 'uuid';
import { generateMap } from './GameEngine.js';
import { aiPlayerManager } from './AIPlayerManager.js';

const ROOM_CLEANUP_INTERVAL = 60000;
const ROOM_MAX_AGE = 3600000;
const PLAYER_IDLE_TIMEOUT = 300000;
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export class RoomManager {
  private rooms: Map<string, Room> = new Map();
  private playerRooms: Map<string, string> = new Map();
  private chatHistory: Map<string, ChatMessage[]> = new Map();

  constructor() {
    this.startCleanupInterval();
  }

  private startCleanupInterval(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [roomId, room] of this.rooms.entries()) {
        if (now - room.lastActivity > ROOM_MAX_AGE) {
          this.deleteRoom(roomId);
          continue;
        }

        for (const [playerId, player] of room.players.entries()) {
          if (now - player.lastActivity > PLAYER_IDLE_TIMEOUT) {
            this.kickPlayer(roomId, playerId, 'Inactif pendant 5 minutes');
          }
        }
      }
    }, ROOM_CLEANUP_INTERVAL);
  }

  generateRoomCode(): string {
    let code: string;
    do {
      code = '';
      for (let i = 0; i < 4; i++) {
        code += CHARS[Math.floor(Math.random() * CHARS.length)];
      }
    } while (this.getRoomByCode(code) !== null);
    return code;
  }

  createRoom(_hostId: string, _hostSocketId: string, data: { name: string; mapSize: number; maxPlayers: number }): Room {
    const id = uuidv4();
    const code = this.generateRoomCode();
    const board = generateMap(data.mapSize);

    const gameState: GameState = {
      phase: GamePhase.LOBBY,
      currentRegister: 0,
      currentPhaseStep: null,
      turnNumber: 0,
      winner: null,
    };

    const room: Room = {
      id,
      code,
      name: data.name,
      mapSize: data.mapSize,
      maxPlayers: data.maxPlayers,
      players: new Map(),
      gameState,
      board,
      lasers: this.extractLasers(board),
      createdAt: Date.now(),
      lastActivity: Date.now(),
      phaseTimer: null,
      phaseStartTime: null,
    };

    this.rooms.set(id, room);
    this.chatHistory.set(id, []);
    return room;
  }

  private extractLasers(board: Cell[][]): { x: number; y: number; direction: Direction; count: number }[] {
    const lasers: { x: number; y: number; direction: Direction; count: number }[] = [];
    for (let y = 0; y < board.length; y++) {
      const row = board[y];
      if (!row) continue;
      for (let x = 0; x < row.length; x++) {
        const cell = row[x];
        if (!cell) continue;
        if (cell.type === CellType.LASER && cell.direction !== undefined) {
          const existing = lasers.find(l => l.x === x && l.y === y && l.direction === cell.direction);
          if (existing) {
            existing.count++;
          } else {
            lasers.push({ x, y, direction: cell.direction, count: 1 });
          }
        }
      }
    }
    return lasers;
  }

  getRoom(id: string): Room | undefined {
    return this.rooms.get(id);
  }

  getRoomByCode(code: string): Room | null {
    for (const room of this.rooms.values()) {
      if (room.code === code) return room;
    }
    return null;
  }

  deleteRoom(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (room) {
      for (const player of room.players.values()) {
        this.playerRooms.delete(player.socketId);
      }
    }
    this.rooms.delete(roomId);
    this.chatHistory.delete(roomId);
  }

  addPlayer(roomId: string, socketId: string, name: string, avatar: string, color: string): Player | null {
    const room = this.rooms.get(roomId);
    console.log('addPlayer debug:', {
      roomExists: !!room,
      roomId,
      playersSize: room?.players.size,
      maxPlayers: room?.maxPlayers,
      phase: room?.gameState.phase,
      expectedPhase: GamePhase.LOBBY,
      phaseMatch: room?.gameState.phase === GamePhase.LOBBY
    });
    if (!room) return null;
    if (room.players.size >= room.maxPlayers) return null;
    if (room.gameState.phase !== GamePhase.LOBBY) {
      console.log('addPlayer rejected: wrong phase', room.gameState.phase, '!==', GamePhase.LOBBY);
      return null;
    }

    const isHost = room.players.size === 0;
    const spawnPos = this.findSpawnPosition(room);

    // Create robot for all players if spawn position is available
    const robot = spawnPos
      ? {
          id: uuidv4(),
          playerId: socketId,
          x: spawnPos.x,
          y: spawnPos.y,
          direction: Direction.EAST,
          lives: room.players.size >= 4 ? 4 : 3,
          damage: 0,
          powerDown: false,
          flagsTouched: [],
          lockedRegisters: [false, false, false, false, false],
          equipment: [],
          archiveX: spawnPos.x,
          archiveY: spawnPos.y,
          archiveDirection: Direction.EAST,
          destroyed: false,
        }
      : null;

    const player: Player = {
      id: uuidv4(),
      socketId,
      name,
      avatar,
      color,
      isHost,
      isReady: false,
      isAI: false,
      robot,
      hand: [],
      registers: [null, null, null, null, null],
      lastActivity: Date.now(),
    };

    room.players.set(socketId, player);
    this.playerRooms.set(socketId, roomId);
    room.lastActivity = Date.now();

    return player;
  }

  private findSpawnPosition(room: Room): Position | null {
    const size = room.mapSize;

    // Search entire board for valid spawn positions
    for (let y = 1; y < size - 1; y++) {
      for (let x = 1; x < size - 1; x++) {
        let occupied = false;
        for (const player of room.players.values()) {
          if (player.robot && player.robot.x === x && player.robot.y === y) {
            occupied = true;
            break;
          }
        }
        const row = room.board[y];
        if (!row) continue;
        const cell = row[x];
        if (!cell) continue;
        if (!occupied && cell.type !== CellType.WALL && cell.type !== CellType.PIT) {
          return { x, y };
        }
      }
    }
    return null;
  }

  removePlayer(socketId: string): Room | null {
    const roomId = this.playerRooms.get(socketId);
    if (!roomId) return null;

    const room = this.rooms.get(roomId);
    if (!room) return null;

    room.players.delete(socketId);
    this.playerRooms.delete(socketId);

    if (room.players.size === 0) {
      this.deleteRoom(roomId);
      return null;
    }

    const remainingPlayers = Array.from(room.players.values());
    if (remainingPlayers.length > 0 && !remainingPlayers.some((p: Player) => p.isHost)) {
      const firstPlayer = remainingPlayers[0];
      if (firstPlayer) {
        firstPlayer.isHost = true;
      }
    }

    room.lastActivity = Date.now();
    return room;
  }

  kickPlayer(roomId: string, playerId: string, _reason: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const player = room.players.get(playerId);
    if (!player) return;

    room.players.delete(playerId);
    this.playerRooms.delete(playerId);

    if (room.players.size === 0) {
      this.deleteRoom(roomId);
    }
  }

  setPlayerReady(socketId: string, isReady: boolean): Room | null {
    const roomId = this.playerRooms.get(socketId);
    if (!roomId) return null;

    const room = this.rooms.get(roomId);
    if (!room) return null;

    const player = room.players.get(socketId);
    if (!player) return null;

    player.isReady = isReady;
    player.lastActivity = Date.now();
    room.lastActivity = Date.now();

    return room;
  }

  allPlayersReady(room: Room): boolean {
    if (room.players.size < 2) return false;
    return Array.from(room.players.values()).every(p => p.isReady);
  }

  startGame(socketId: string): Room | null {
    const roomId = this.playerRooms.get(socketId);
    if (!roomId) return null;

    const room = this.rooms.get(roomId);
    if (!room) return null;

    const player = room.players.get(socketId);
    if (!player?.isHost) return null;

    if (!this.allPlayersReady(room)) return null;

    room.gameState.phase = GamePhase.PROGRAMMING;
    room.gameState.turnNumber = 1;
    room.lastActivity = Date.now();

    for (const p of room.players.values()) {
      this.dealCards(p);
    }

    return room;
  }

  dealCards(player: Player): void {
    if (!player.robot) return;

    const handSize = Math.max(0, 9 - player.robot.damage);
    const cards: { id: string; type: CardType; priority: number }[] = [];

    for (let i = 0; i < handSize; i++) {
      const rand = Math.random();
      let cumulative = 0;
      let selected: CardType = CardType.FORWARD_1;

      for (const [type, prob] of Object.entries(CARD_PROBABILITIES)) {
        cumulative += prob as number;
        if (rand <= cumulative) {
          selected = type as CardType;
          break;
        }
      }

      cards.push({
        id: uuidv4(),
        type: selected,
        priority: Math.floor(Math.random() * 1000),
      });
    }

    player.hand = cards;
  }

  addAIPlayer(
    roomId: string,
    name: string,
    avatar: string,
    color: string,
    difficulty: Difficulty
  ): Player | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;
    if (room.players.size >= room.maxPlayers) return null;
    if (room.gameState.phase !== GamePhase.LOBBY) return null;

    const aiSocketId = `ai-${uuidv4()}`;
    const spawnPos = this.findSpawnPosition(room);

    const player = aiPlayerManager.createAIPlayer(
      aiSocketId,
      name,
      avatar,
      color,
      difficulty,
      false,
      spawnPos
    );

    room.players.set(aiSocketId, player);
    this.playerRooms.set(aiSocketId, roomId);
    room.lastActivity = Date.now();

    return player;
  }

  removeAIPlayer(roomId: string, playerId: string): Room | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    const player = room.players.get(playerId);
    if (!player || !player.isAI) return null;

    aiPlayerManager.releaseAIName(player.name);
    room.players.delete(playerId);
    this.playerRooms.delete(playerId);

    room.lastActivity = Date.now();
    return room;
  }

  getAIProgram(player: Player, room: Room): ({ id: string; type: CardType; priority: number } | null)[] {
    if (!player.isAI) return player.registers;
    return aiPlayerManager.chooseCards(player, room);
  }

  submitProgram(
    socketId: string,
    registers: ({ id: string; type: CardType; priority: number } | null)[],
    powerDown: boolean
  ): Room | null {
    const roomId = this.playerRooms.get(socketId);
    if (!roomId) return null;

    const room = this.rooms.get(roomId);
    if (!room) return null;

    const player = room.players.get(socketId);
    if (!player || !player.robot) return null;

    player.registers = registers;
    player.robot.powerDown = powerDown;
    player.lastActivity = Date.now();

    // For AI players, automatically set isReady when they have programmed all registers
    if (player.isAI && registers.every(r => r !== null)) {
      player.isReady = true;
    }

    return room;
  }

  addChatMessage(roomId: string, playerId: string, playerName: string, playerColor: string, message: string): ChatMessage | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    const chatMsg: ChatMessage = {
      id: uuidv4(),
      playerId,
      playerName,
      playerColor,
      message,
      timestamp: Date.now(),
    };

    const history = this.chatHistory.get(roomId) || [];
    history.push(chatMsg);
    if (history.length > 50) history.shift();
    this.chatHistory.set(roomId, history);

    return chatMsg;
  }

  getChatHistory(roomId: string): ChatMessage[] {
    return this.chatHistory.get(roomId) || [];
  }

  getPlayerRoom(socketId: string): Room | undefined {
    const roomId = this.playerRooms.get(socketId);
    if (!roomId) return undefined;
    return this.rooms.get(roomId);
  }

  updatePlayerActivity(socketId: string): void {
    const roomId = this.playerRooms.get(socketId);
    if (!roomId) return;

    const room = this.rooms.get(roomId);
    if (!room) return;

    const player = room.players.get(socketId);
    if (player) {
      player.lastActivity = Date.now();
    }
    room.lastActivity = Date.now();
  }

  getAllRooms(): Room[] {
    return Array.from(this.rooms.values());
  }
}

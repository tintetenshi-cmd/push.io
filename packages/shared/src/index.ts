export enum CellType {
  EMPTY = 'empty',
  WALL = 'wall',
  CONVEYOR_NORMAL = 'conveyor_normal',
  CONVEYOR_EXPRESS = 'conveyor_express',
  GEAR_LEFT = 'gear_left',
  GEAR_RIGHT = 'gear_right',
  PUSHER_NORTH = 'pusher_north',
  PUSHER_SOUTH = 'pusher_south',
  PUSHER_EAST = 'pusher_east',
  PUSHER_WEST = 'pusher_west',
  PIT = 'pit',
  LASER = 'laser',
  FLAG_1 = 'flag_1',
  FLAG_2 = 'flag_2',
  FLAG_3 = 'flag_3',
  FLAG_4 = 'flag_4',
  FLAG_5 = 'flag_5',
  SPAWN = 'spawn',
  ARCHIVE = 'archive',
}

export enum Direction {
  NORTH = 0,
  EAST = 90,
  SOUTH = 180,
  WEST = 270,
}

export enum CardType {
  U_TURN = 'u_turn',
  ROTATE_LEFT = 'rotate_left',
  ROTATE_RIGHT = 'rotate_right',
  FORWARD_1 = 'forward_1',
  FORWARD_2 = 'forward_2',
  FORWARD_3 = 'forward_3',
  BACKUP_1 = 'backup_1',
  BACKUP_2 = 'backup_2',
  BACKUP_3 = 'backup_3',
  POWER_DOWN = 'power_down',
}

export enum GamePhase {
  LOBBY = 'lobby',
  PROGRAMMING = 'programming',
  RESOLUTION = 'resolution',
  ENDED = 'ended',
}

export enum PhaseStep {
  REVEAL_CARDS = 'reveal_cards',
  MOVE_ROBOTS = 'move_robots',
  BOARD_ELEMENTS = 'board_elements',
  LASERS = 'lasers',
  TOUCH_CHECKPOINTS = 'touch_checkpoints',
  CLEANUP = 'cleanup',
}

export interface Position {
  x: number;
  y: number;
}

export interface Cell {
  type: CellType;
  direction?: Direction;
}

export interface Card {
  id: string;
  type: CardType;
  priority: number;
}

export interface Robot {
  id: string;
  playerId: string;
  x: number;
  y: number;
  direction: Direction;
  lives: number;
  damage: number;
  powerDown: boolean;
  flagsTouched: number[];
  lockedRegisters: boolean[];
  equipment: string[];
  archiveX: number;
  archiveY: number;
  archiveDirection: Direction;
  destroyed: boolean;
}

export enum Difficulty {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
}

export interface Player {
  id: string;
  socketId: string;
  name: string;
  avatar: string;
  color: string;
  isHost: boolean;
  isReady: boolean;
  isAI: boolean;
  difficulty?: Difficulty;
  robot: Robot | null;
  hand: Card[];
  registers: (Card | null)[];
  lastActivity: number;
}

export interface GameState {
  phase: GamePhase;
  currentRegister: number;
  currentPhaseStep: PhaseStep | null;
  turnNumber: number;
  winner: string | null;
}

export interface Room {
  id: string;
  code: string;
  name: string;
  mapSize: number;
  maxPlayers: number;
  players: Map<string, Player>;
  gameState: GameState;
  board: Cell[][];
  lasers: { x: number; y: number; direction: Direction; count: number }[];
  createdAt: number;
  lastActivity: number;
  phaseTimer: number | null;
  phaseStartTime: number | null;
}

export interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  playerColor: string;
  message: string;
  timestamp: number;
}

export interface GameUpdate {
  room: Room;
  players: Player[];
  chat: ChatMessage[];
}

export const AVATAR_OPTIONS = [
  'tank',
  'wheelbot',
  'flybot',
  'hovercraft',
  'rollerbot',
  'spherebot',
  'hammerbot',
  'twonkybot',
] as const;

export const COLOR_OPTIONS = [
  '#FF4444',
  '#44FF44',
  '#4444FF',
  '#FFFF44',
  '#FF44FF',
  '#44FFFF',
  '#FFAA00',
  '#AAFF00',
  '#00FFAA',
  '#AA00FF',
] as const;

export const MAP_SIZE_OPTIONS = [8, 10, 11, 12] as const;

export const MAX_PLAYERS_OPTIONS = [2, 3, 4, 5, 6, 7, 8] as const;

export const CARD_PRIORITIES: Record<CardType, number> = {
  [CardType.FORWARD_3]: 1,
  [CardType.FORWARD_2]: 2,
  [CardType.FORWARD_1]: 3,
  [CardType.ROTATE_LEFT]: 4,
  [CardType.ROTATE_RIGHT]: 4,
  [CardType.BACKUP_1]: 5,
  [CardType.BACKUP_2]: 5,
  [CardType.BACKUP_3]: 5,
  [CardType.U_TURN]: 6,
  [CardType.POWER_DOWN]: 7,
};

export const CARD_PROBABILITIES: Record<CardType, number> = {
  [CardType.U_TURN]: 0.20,
  [CardType.ROTATE_LEFT]: 0.15,
  [CardType.ROTATE_RIGHT]: 0.15,
  [CardType.FORWARD_1]: 0.12,
  [CardType.FORWARD_2]: 0.12,
  [CardType.FORWARD_3]: 0.12,
  [CardType.BACKUP_1]: 0.05,
  [CardType.BACKUP_2]: 0.05,
  [CardType.BACKUP_3]: 0.04,
  [CardType.POWER_DOWN]: 0,
};

export type AvatarType = (typeof AVATAR_OPTIONS)[number];
export type ColorType = (typeof COLOR_OPTIONS)[number];
export type MapSizeType = (typeof MAP_SIZE_OPTIONS)[number];
export type MaxPlayersType = (typeof MAX_PLAYERS_OPTIONS)[number];

export interface PlayerSettings {
  name: string;
  avatar: AvatarType;
  color: ColorType;
}

export interface CreateRoomData {
  name: string;
  mapSize: MapSizeType;
  maxPlayers: MaxPlayersType;
}

export interface JoinRoomData {
  code: string;
  playerName: string;
  playerAvatar: AvatarType;
  playerColor: ColorType;
}

export interface ProgramData {
  registers: (Card | null)[];
  powerDown: boolean;
}

export interface ServerToClientEvents {
  'room:update': (update: GameUpdate) => void;
  'game:started': () => void;
  'game:phase': (phase: GamePhase, register: number) => void;
  'game:phaseUpdate': (step: PhaseStep, progress: number) => void;
  'chat:message': (message: ChatMessage) => void;
  'player:kicked': (reason: string) => void;
  'error': (message: string) => void;
}

export interface ClientToServerEvents {
  'room:create': (data: CreateRoomData, callback: (result: { success: boolean; roomCode?: string; error?: string }) => void) => void;
  'room:join': (data: JoinRoomData, callback: (result: { success: boolean; roomId?: string; error?: string }) => void) => void;
  'room:leave': () => void;
  'room:ready': (isReady: boolean) => void;
  'room:start': (callback: (result: { success: boolean; error?: string }) => void) => void;
  'room:addBot': (data: { difficulty: Difficulty }, callback: (result: { success: boolean; error?: string }) => void) => void;
  'room:removeBot': (data: { playerId: string }, callback: (result: { success: boolean; error?: string }) => void) => void;
  'game:program': (data: ProgramData) => void;
  'chat:send': (message: string) => void;
  'player:ping': () => void;
}

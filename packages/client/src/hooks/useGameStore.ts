import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Socket } from 'socket.io-client';
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  GameUpdate,
  ChatMessage,
  Player,
  Room,
  GamePhase,
  PhaseStep,
  PlayerSettings,
} from '@roborally/shared';

interface GameState {
  phase: GamePhase;
  currentRegister: number;
  currentStep: PhaseStep | null;
  stepProgress: number;
}

interface GameStore {
  socket: Socket<ServerToClientEvents, ClientToServerEvents> | null;
  isConnected: boolean;
  room: Room | null;
  players: Player[];
  chat: ChatMessage[];
  playerSettings: PlayerSettings;
  roomCode: string | null;
  gameState: GameState;
  currentPlayerId: string | null;

  setSocket: (socket: Socket<ServerToClientEvents, ClientToServerEvents> | null) => void;
  setConnected: (connected: boolean) => void;
  setRoomUpdate: (update: GameUpdate) => void;
  addChatMessage: (message: ChatMessage) => void;
  setPlayerSettings: (settings: PlayerSettings) => void;
  setRoomCode: (code: string | null) => void;
  setGamePhase: (phase: GamePhase, register: number) => void;
  setGamePhaseUpdate: (step: PhaseStep, progress: number) => void;
  setCurrentPlayerId: (id: string | null) => void;
}

const defaultSettings: PlayerSettings = {
  name: 'Joueur',
  avatar: 'tank',
  color: '#FF4444',
};

const defaultGameState: GameState = {
  phase: 'lobby' as GamePhase,
  currentRegister: 0,
  currentStep: null,
  stepProgress: 0,
};

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      socket: null,
      isConnected: false,
      room: null,
      players: [],
      chat: [],
      playerSettings: defaultSettings,
      roomCode: null,
      gameState: defaultGameState,
      currentPlayerId: null,

      setSocket: (socket) => set({ socket }),
      setConnected: (isConnected) => set({ isConnected }),
      setRoomUpdate: (update) => set({
        room: update.room,
        players: update.players,
        chat: update.chat,
      }),
      addChatMessage: (message) => set((state) => ({
        chat: [...state.chat.slice(-49), message],
      })),
      setPlayerSettings: (playerSettings) => set({ playerSettings }),
      setRoomCode: (roomCode) => set({ roomCode }),
      setGamePhase: (phase, currentRegister) => set((state) => ({
        gameState: { ...state.gameState, phase, currentRegister },
      })),
      setGamePhaseUpdate: (currentStep, stepProgress) => set((state) => ({
        gameState: { ...state.gameState, currentStep, stepProgress },
      })),
      setCurrentPlayerId: (currentPlayerId) => set({ currentPlayerId }),
    }),
    {
      name: 'roborally-storage',
      partialize: (state) => ({ playerSettings: state.playerSettings }),
    }
  )
);

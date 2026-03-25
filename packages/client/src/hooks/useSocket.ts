import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useGameStore } from './useGameStore';
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  GameUpdate,
  ChatMessage,
  GamePhase,
  PhaseStep,
} from '@roborally/shared';

// Type declaration for import.meta.env
interface ImportMetaEnv {
  VITE_SOCKET_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

export function useSocket(): {
  socket: Socket<ServerToClientEvents, ClientToServerEvents> | null;
  isConnected: boolean;
  gameState: { phase: GamePhase; currentRegister: number };
} {
  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  const {
    setSocket,
    setConnected,
    setRoomUpdate,
    addChatMessage,
    setGamePhase,
    setGamePhaseUpdate,
    isConnected,
    gameState,
  } = useGameStore();

  useEffect(() => {
    const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;
    setSocket(socket);

    socket.on('connect', () => {
      setConnected(true);
      console.log('Socket connected:', socket.id);
    });

    socket.on('disconnect', () => {
      setConnected(false);
      console.log('Socket disconnected');
    });

    socket.on('room:update', (update: GameUpdate) => {
      setRoomUpdate(update);
    });

    socket.on('game:started', () => {
      console.log('Game started');
    });

    socket.on('game:phase', (phase: GamePhase, register: number) => {
      setGamePhase(phase, register);
    });

    socket.on('game:phaseUpdate', (step: PhaseStep, progress: number) => {
      setGamePhaseUpdate(step, progress);
    });

    socket.on('chat:message', (message: ChatMessage) => {
      addChatMessage(message);
    });

    socket.on('player:kicked', (reason: string) => {
      alert(`Vous avez été expulsé: ${reason}`);
      window.location.reload();
    });

    socket.on('error', (message: string) => {
      console.error('Socket error:', message);
      alert(`Erreur: ${message}`);
    });

    const pingInterval = setInterval(() => {
      if (socket.connected) {
        socket.emit('player:ping');
      }
    }, 30000);

    return () => {
      clearInterval(pingInterval);
      socket.disconnect();
    };
  }, [setSocket, setConnected, setRoomUpdate, addChatMessage, setGamePhase, setGamePhaseUpdate]);

  return {
    socket: socketRef.current,
    isConnected,
    gameState,
  };
}

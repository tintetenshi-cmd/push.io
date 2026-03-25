import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Users, Play, Check, X, Crown } from 'lucide-react';
import { useGameStore } from '../hooks/useGameStore';
import { AVATAR_SVGS } from '../utils/svgAvatars';

interface GameLobbyProps {
  onBack: () => void;
}

export default function GameLobby({ onBack }: GameLobbyProps): React.ReactElement {
  const { room, players, socket, playerSettings } = useGameStore();
  const [isReady, setIsReady] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  const currentPlayer = players.find((p) => p.name === playerSettings.name);
  const isHost = currentPlayer?.isHost ?? false;
  const allReady = players.length >= 2 && players.every((p) => p.isReady);

  const handleReady = (): void => {
    if (!socket) return;
    const newReady = !isReady;
    setIsReady(newReady);
    socket.emit('room:ready', newReady);
  };

  const handleStartGame = (): void => {
    if (!socket || !isHost || !allReady) return;
    setIsStarting(true);
    socket.emit('room:start', (result: { success: boolean; error?: string }) => {
      setIsStarting(false);
      if (!result.success) {
        alert(result.error || 'Impossible de démarrer la partie');
      }
    });
  };

  const handleLeave = (): void => {
    if (!socket) return;
    socket.emit('room:leave');
    onBack();
  };

  if (!room) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-primary-300">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={handleLeave}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-800/50 hover:bg-primary-700/50 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Retour
        </button>
        <div className="text-center">
          <h2 className="text-2xl font-bold">{room.name}</h2>
          <p className="text-primary-400 font-mono text-lg">Code: {room.code}</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-800/50">
          <Users className="w-5 h-5" />
          {players.length}/{room.maxPlayers}
        </div>
      </div>

      <div className="flex-1 bg-primary-900/30 rounded-xl p-4 mb-4 overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4">Joueurs ({players.length})</h3>
        <div className="space-y-3">
          {players.map((player) => (
            <motion.div
              key={player.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className={`flex items-center gap-4 p-4 rounded-lg ${
                player.isReady ? 'bg-green-900/30' : 'bg-primary-800/50'
              }`}
            >
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{ backgroundColor: player.color }}
              >
                <img
                  src={AVATAR_SVGS[player.avatar as keyof typeof AVATAR_SVGS]}
                  alt={player.avatar}
                  className="w-8 h-8"
                />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold" style={{ color: player.color }}>
                    {player.name}
                  </span>
                  {player.isHost && (
                    <Crown className="w-4 h-4 text-yellow-400" />
                  )}
                </div>
                {player.robot && (
                  <div className="text-sm text-primary-400">
                    ♥{player.robot.lives} | ⚡{player.robot.damage}/10
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {player.isReady ? (
                  <span className="flex items-center gap-1 text-green-400">
                    <Check className="w-4 h-4" />
                    Prêt
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-red-400">
                    <X className="w-4 h-4" />
                    En attente
                  </span>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="flex gap-4">
        <button
          onClick={handleReady}
          className={`flex-1 py-4 rounded-lg font-semibold transition-all ${
            isReady
              ? 'bg-red-600 hover:bg-red-500'
              : 'bg-green-600 hover:bg-green-500 animate-pulse'
          }`}
        >
          {isReady ? 'Annuler' : 'Prêt'}
        </button>
        {isHost && (
          <button
            onClick={handleStartGame}
            disabled={!allReady || isStarting}
            className="flex-1 py-4 rounded-lg bg-primary-500 hover:bg-primary-400 disabled:bg-primary-800 disabled:cursor-not-allowed font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <Play className="w-5 h-5" />
            {isStarting ? 'Démarrage...' : 'Lancer'}
          </button>
        )}
      </div>
    </div>
  );
}

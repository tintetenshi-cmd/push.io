import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Plus, Users, Copy, Check } from 'lucide-react';
import { useGameStore } from '../hooks/useGameStore';
import type { MapSizeType, MaxPlayersType } from '@roborally/shared';

interface MenuPrincipalProps {
  onClose: () => void;
  onCreateRoom: (code: string) => void;
  onJoinRoom: (code: string) => void;
}

const MAP_SIZES: { value: MapSizeType; label: string }[] = [
  { value: 8, label: '8x8' },
  { value: 10, label: '10x10' },
  { value: 11, label: '11x11' },
  { value: 12, label: '12x12' },
];

export default function MenuPrincipal({ onClose, onCreateRoom, onJoinRoom }: MenuPrincipalProps): React.ReactElement {
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  const [roomName, setRoomName] = useState('');
  const [mapSize, setMapSize] = useState<MapSizeType>(10);
  const [maxPlayers, setMaxPlayers] = useState<MaxPlayersType>(4);
  const [joinCode, setJoinCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { socket, playerSettings } = useGameStore();

  const handleCreateRoom = (): void => {
    if (!socket || !roomName.trim()) return;

    setIsLoading(true);
    socket.emit(
      'room:create',
      { name: roomName, mapSize, maxPlayers },
      (result: { success: boolean; room?: { code: string }; error?: string }) => {
        setIsLoading(false);
        if (result.success && result.room?.code) {
          onCreateRoom(result.room.code);
        } else {
          alert(result.error || 'Failed to create room');
        }
      }
    );
  };

  const handleJoinRoom = (): void => {
    if (!socket || !joinCode.trim()) return;

    setIsLoading(true);
    socket.emit(
      'room:join',
      {
        code: joinCode.toUpperCase(),
        playerName: playerSettings.name,
        playerAvatar: playerSettings.avatar,
        playerColor: playerSettings.color,
      },
      (result: { success: boolean; roomId?: string; error?: string }) => {
        setIsLoading(false);
        if (result.success) {
          onJoinRoom(joinCode.toUpperCase());
        } else {
          alert(result.error || 'Failed to join room');
        }
      }
    );
  };

  const copyCode = (): void => {
    if (joinCode) {
      navigator.clipboard.writeText(joinCode.toUpperCase());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Jouer</h2>
            <button onClick={onClose} className="p-2 hover:bg-primary-700/50 rounded-lg">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex gap-4 mb-6">
            <button
              onClick={() => setActiveTab('create')}
              className={`flex-1 py-3 rounded-lg font-semibold transition-colors ${
                activeTab === 'create'
                  ? 'bg-primary-500 text-white'
                  : 'bg-primary-700/50 text-primary-300'
              }`}
            >
              <Plus className="w-5 h-5 inline mr-2" />
              Créer
            </button>
            <button
              onClick={() => setActiveTab('join')}
              className={`flex-1 py-3 rounded-lg font-semibold transition-colors ${
                activeTab === 'join'
                  ? 'bg-primary-500 text-white'
                  : 'bg-primary-700/50 text-primary-300'
              }`}
            >
              <Users className="w-5 h-5 inline mr-2" />
              Rejoindre
            </button>
          </div>

          {activeTab === 'create' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Nom de la room</label>
                <input
                  type="text"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="Ma partie RoboRally"
                  className="w-full px-4 py-3 rounded-lg bg-primary-900/50 border border-primary-600 focus:border-primary-400 focus:outline-none"
                  maxLength={20}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Taille du plateau</label>
                <select
                  value={mapSize}
                  onChange={(e) => setMapSize(Number(e.target.value) as MapSizeType)}
                  className="w-full px-4 py-3 rounded-lg bg-primary-900/50 border border-primary-600 focus:border-primary-400 focus:outline-none"
                >
                  {MAP_SIZES.map((size) => (
                    <option key={size.value} value={size.value}>
                      {size.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Nombre de joueurs: {maxPlayers}
                </label>
                <input
                  type="range"
                  min={2}
                  max={8}
                  value={maxPlayers}
                  onChange={(e) => setMaxPlayers(Number(e.target.value) as MaxPlayersType)}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-primary-400 mt-1">
                  <span>2</span>
                  <span>8</span>
                </div>
              </div>

              <button
                onClick={handleCreateRoom}
                disabled={!roomName.trim() || isLoading}
                className="w-full py-4 rounded-lg bg-primary-500 hover:bg-primary-400 disabled:bg-primary-800 disabled:cursor-not-allowed font-semibold transition-colors"
              >
                {isLoading ? 'Création...' : 'Créer la partie'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Code de la room (4 caractères)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 4))}
                    placeholder="ABCD"
                    className="flex-1 px-4 py-3 rounded-lg bg-primary-900/50 border border-primary-600 focus:border-primary-400 focus:outline-none text-center text-2xl font-mono tracking-widest uppercase"
                    maxLength={4}
                  />
                  <button
                    onClick={copyCode}
                    disabled={!joinCode}
                    className="px-4 py-3 rounded-lg bg-primary-700 hover:bg-primary-600 disabled:bg-primary-800 disabled:cursor-not-allowed transition-colors"
                  >
                    {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button
                onClick={handleJoinRoom}
                disabled={joinCode.length !== 4 || isLoading}
                className="w-full py-4 rounded-lg bg-primary-500 hover:bg-primary-400 disabled:bg-primary-800 disabled:cursor-not-allowed font-semibold transition-colors"
              >
                {isLoading ? 'Connexion...' : 'Rejoindre la partie'}
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

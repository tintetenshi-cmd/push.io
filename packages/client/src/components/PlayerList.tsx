import React from 'react';
import { motion } from 'framer-motion';
import { Users, Crown, Heart, Zap } from 'lucide-react';
import { AVATAR_SVGS } from '../utils/svgAvatars';

interface PlayerListProps {
  players: Array<{
    id: string;
    name: string;
    color: string;
    avatar: string;
    isHost: boolean;
    isReady: boolean;
    robot: {
      lives: number;
      damage: number;
      flagsTouched: number[];
    } | null;
  }>;
  currentPlayer: {
    id: string;
    name: string;
    color: string;
  } | undefined;
}

export default function PlayerList({ players, currentPlayer }: PlayerListProps): React.ReactElement {
  return (
    <div className="bg-primary-800/50 rounded-xl p-4">
      <h3 className="font-semibold mb-3 flex items-center gap-2">
        <Users className="w-4 h-4" />
        Joueurs ({players.length})
      </h3>
      <div className="space-y-2">
        {players.map((player) => (
          <motion.div
            key={player.id}
            whileHover={{ scale: 1.02 }}
            className={`flex items-center gap-3 p-3 rounded-lg ${
              player.id === currentPlayer?.id ? 'bg-primary-600/50 ring-2 ring-primary-400' : 'bg-primary-900/30'
            }`}
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: player.color }}
            >
              <img
                src={AVATAR_SVGS[player.avatar as keyof typeof AVATAR_SVGS]}
                alt={player.avatar}
                className="w-6 h-6"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium truncate" style={{ color: player.color }}>
                  {player.name}
                </span>
                {player.isHost && <Crown className="w-3 h-3 text-yellow-400 flex-shrink-0" />}
              </div>
              {player.robot && (
                <div className="flex items-center gap-2 text-xs text-primary-400">
                  <span className="flex items-center gap-1">
                    <Heart className="w-3 h-3 text-red-400" />
                    {player.robot.lives}
                  </span>
                  <span className="flex items-center gap-1">
                    <Zap className="w-3 h-3 text-yellow-400" />
                    {player.robot.damage}/10
                  </span>
                  <span>Drapeaux: {player.robot.flagsTouched.length}/5</span>
                </div>
              )}
            </div>
            <div
              className={`w-3 h-3 rounded-full ${
                player.isReady ? 'bg-green-400' : 'bg-red-400'
              }`}
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

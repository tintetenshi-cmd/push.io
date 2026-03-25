import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { LogOut, Send, MessageSquare, Users } from 'lucide-react';
import { useGameStore } from '../hooks/useGameStore';
import GameCanvas from './Canvas/GameCanvas';
import CardHand from './CardHand';
import RegisterSlots from './RegisterSlots';
import ReadyBtn from './ReadyBtn';
import PlayerList from './PlayerList';

interface GameRoomProps {
  onLeave: () => void;
}

export default function GameRoom({ onLeave }: GameRoomProps): React.ReactElement {
  const { room, players, chat, socket, gameState, playerSettings } = useGameStore();
  const [message, setMessage] = useState('');
  const [showSidebar, setShowSidebar] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat]);

  const handleSendMessage = (e: React.FormEvent): void => {
    e.preventDefault();
    if (!socket || !message.trim()) return;
    socket.emit('chat:send', message.trim());
    setMessage('');
  };

  const handleLeave = (): void => {
    if (!socket) return;
    socket.emit('room:leave');
    onLeave();
  };

  if (!room) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-primary-300">Chargement...</p>
      </div>
    );
  }

  const currentPlayer = players.find((p) => p.name === playerSettings.name);

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between p-4 bg-primary-800/50 rounded-lg mb-4">
        <div>
          <h2 className="text-xl font-bold">{room.name}</h2>
          <p className="text-sm text-primary-400">
            Tour {room.gameState.turnNumber} | Phase: {gameState.phase}
            {gameState.currentRegister > 0 && ` - Registre ${gameState.currentRegister}/5`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="p-2 rounded-lg bg-primary-700/50 hover:bg-primary-600/50 lg:hidden"
          >
            <MessageSquare className="w-5 h-5" />
          </button>
          <button
            onClick={handleLeave}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600/50 hover:bg-red-500/50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Quitter
          </button>
        </div>
      </header>

      <div className="flex-1 flex gap-4 overflow-hidden">
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          <div className="flex-1 relative rounded-xl overflow-hidden bg-primary-900/50">
            <GameCanvas room={room} players={players} />
          </div>

          {currentPlayer && gameState.phase === 'programming' && (
            <div className="flex flex-col gap-2">
              <RegisterSlots player={currentPlayer} />
              <CardHand player={currentPlayer} />
              <ReadyBtn />
            </div>
          )}
        </div>

        {showSidebar && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="w-80 flex flex-col gap-4"
          >
            <PlayerList players={players} currentPlayer={currentPlayer} />

            <div className="flex-1 bg-primary-800/50 rounded-xl p-4 flex flex-col">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Chat
              </h3>
              <div className="flex-1 overflow-y-auto space-y-2 mb-3 max-h-64">
                {chat.map((msg, i) => (
                  <div key={i} className="text-sm">
                    <span style={{ color: msg.playerColor }} className="font-medium">
                      {msg.playerName}
                    </span>
                    <span className="text-primary-400 text-xs ml-2">
                      {new Date(msg.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <p className="text-primary-200">{msg.message}</p>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Message..."
                  className="flex-1 px-3 py-2 rounded-lg bg-primary-900/50 border border-primary-600 focus:border-primary-400 focus:outline-none text-sm"
                  maxLength={200}
                />
                <button
                  type="submit"
                  disabled={!message.trim()}
                  className="p-2 rounded-lg bg-primary-500 hover:bg-primary-400 disabled:bg-primary-800 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

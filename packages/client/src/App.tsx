import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Settings, BookOpen, Sun, Moon, Gamepad2 } from 'lucide-react';
import { useGameStore } from './hooks/useGameStore';
import { useSocket } from './hooks/useSocket';
import MenuPrincipal from './components/MenuPrincipal';
import PersonalizeModal from './components/PersonalizeModal';
import RulesModal from './components/RulesModal';
import GameLobby from './components/GameLobby';
import GameRoom from './components/GameRoom';
import type { GamePhase } from '@roborally/shared';

function App(): React.ReactElement {
  const [view, setView] = useState<'menu' | 'lobby' | 'game'>('menu');
  const [showPersonalize, setShowPersonalize] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [isDark, setIsDark] = useState(true);

  const { isConnected, gameState } = useSocket();
  const { playerSettings, roomCode, setRoomCode } = useGameStore();

  useEffect(() => {
    if (gameState.phase === 'lobby') {
      setView('lobby');
    } else if (gameState.phase === 'programming' || gameState.phase === 'resolution') {
      setView('game');
    }
  }, [gameState.phase]);

  useEffect(() => {
    const saved = localStorage.getItem('roborally_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        useGameStore.setState({ playerSettings: parsed });
      } catch {
        // ignore parse error
      }
    }
  }, []);

  useEffect(() => {
    if (playerSettings) {
      localStorage.setItem('roborally_settings', JSON.stringify(playerSettings));
    }
  }, [playerSettings]);

  const handlePlay = (): void => {
    setShowLobby(true);
  };

  const handleLeaveGame = (): void => {
    setView('menu');
    setRoomCode(null);
  };

  const [showLobby, setShowLobby] = useState(false);

  return (
    <div className={`min-h-screen ${isDark ? 'dark' : ''}`}>
      <div className="min-h-screen bg-gradient-to-br from-primary-950 via-primary-900 to-indigo-950">
        <header className="fixed top-0 left-0 right-0 z-40 p-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Gamepad2 className="w-8 h-8 text-primary-400" />
            <h1 className="text-2xl font-bold text-white">RoboRally</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
            <button
              onClick={() => setIsDark(!isDark)}
              className="p-2 rounded-lg bg-primary-800/50 hover:bg-primary-700/50 transition-colors"
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
        </header>

        <main className="pt-20 px-4 pb-4 min-h-screen flex flex-col">
          <AnimatePresence mode="wait">
            {view === 'menu' && (
              <motion.div
                key="menu"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full gap-6"
              >
                <div className="text-center mb-8">
                  <motion.div
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    className="inline-block"
                  >
                    <Gamepad2 className="w-24 h-24 text-primary-400 mx-auto mb-4" />
                  </motion.div>
                  <h2 className="text-4xl font-bold text-white mb-2">RoboRally</h2>
                  <p className="text-primary-300">Course de robots multijoueur</p>
                </div>

                <button onClick={() => setShowLobby(true)} className="btn-hero">
                  <Play className="w-8 h-8" />
                  Jouer
                </button>

                <button onClick={() => setShowPersonalize(true)} className="btn-secondary">
                  <Settings className="w-6 h-6" />
                  Personnaliser
                </button>

                <button onClick={() => setShowRules(true)} className="btn-outline">
                  <BookOpen className="w-6 h-6" />
                  Règles
                </button>
              </motion.div>
            )}

            {view === 'lobby' && (
              <motion.div
                key="lobby"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1"
              >
                <GameLobby onBack={() => setView('menu')} />
              </motion.div>
            )}

            {view === 'game' && (
              <motion.div
                key="game"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1"
              >
                <GameRoom onLeave={handleLeaveGame} />
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {showLobby && view === 'menu' && (
          <MenuPrincipal
            onClose={() => setShowLobby(false)}
            onCreateRoom={(code) => {
              setRoomCode(code);
              setShowLobby(false);
              setView('lobby');
            }}
            onJoinRoom={(code) => {
              setRoomCode(code);
              setShowLobby(false);
              setView('lobby');
            }}
          />
        )}

        {showPersonalize && (
          <PersonalizeModal onClose={() => setShowPersonalize(false)} />
        )}

        {showRules && (
          <RulesModal onClose={() => setShowRules(false)} />
        )}
      </div>
    </div>
  );
}

export default App;

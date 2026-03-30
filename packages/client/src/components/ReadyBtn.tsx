import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, Power } from 'lucide-react';
import { useGameStore } from '../hooks/useGameStore';
import type { Card } from '@roborally/shared';
import { GamePhase } from '@roborally/shared';

interface ReadyBtnProps {
  registers: (Card | null)[];
  isReady?: boolean;
}

export default function ReadyBtn({ registers, isReady: serverIsReady }: ReadyBtnProps): React.ReactElement {
  const { socket, gameState } = useGameStore();
  const [isReady, setIsReady] = useState(serverIsReady ?? false);
  const [powerDown, setPowerDown] = useState(false);

  // Sync with server state and reset when entering programming phase
  useEffect(() => {
    if (serverIsReady !== undefined) {
      setIsReady(serverIsReady);
    }
  }, [serverIsReady]);

  // Reset ready state when entering programming phase (new turn)
  useEffect(() => {
    if (gameState.phase === GamePhase.PROGRAMMING) {
      setIsReady(false);
    }
  }, [gameState.phase]);

  const filledRegisters = registers.filter((r) => r !== null).length;
  const canReady = filledRegisters === 5;

  const handleReady = (): void => {
    if (!socket || !canReady) return;
    const newReady = !isReady;
    setIsReady(newReady);
    socket.emit('room:ready', newReady);
  };

  const handlePowerDown = (): void => {
    if (!socket) return;
    const newPowerDown = !powerDown;
    setPowerDown(newPowerDown);
    socket.emit('game:program', {
      registers: [],
      powerDown: newPowerDown,
    });
  };

  return (
    <div className="flex gap-4">
      <motion.button
        whileTap={{ scale: canReady ? 0.95 : 1 }}
        onClick={handleReady}
        disabled={!canReady}
        className={`flex-1 py-4 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
          !canReady
            ? 'bg-gray-600 cursor-not-allowed'
            : isReady
              ? 'bg-green-600 hover:bg-green-500'
              : 'bg-primary-500 hover:bg-primary-400 animate-pulse'
        }`}
      >
        <Check className="w-5 h-5" />
        {isReady ? 'Prêt!' : `Prêt? (${filledRegisters}/5)`}
      </motion.button>

      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={handlePowerDown}
        className={`px-6 py-4 rounded-lg font-semibold transition-all flex items-center gap-2 ${
          powerDown
            ? 'bg-yellow-600 hover:bg-yellow-500'
            : 'bg-primary-700 hover:bg-primary-600'
        }`}
      >
        <Power className="w-5 h-5" />
        Power Down
      </motion.button>
    </div>
  );
}

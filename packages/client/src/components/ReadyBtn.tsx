import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Power } from 'lucide-react';
import { useGameStore } from '../hooks/useGameStore';

export default function ReadyBtn(): React.ReactElement {
  const { socket, gameState } = useGameStore();
  const [isReady, setIsReady] = useState(false);
  const [powerDown, setPowerDown] = useState(false);

  const handleReady = (): void => {
    if (!socket) return;
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
        whileTap={{ scale: 0.95 }}
        onClick={handleReady}
        className={`flex-1 py-4 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
          isReady
            ? 'bg-green-600 hover:bg-green-500'
            : 'bg-primary-500 hover:bg-primary-400 animate-pulse'
        }`}
      >
        <Check className="w-5 h-5" />
        {isReady ? 'Prêt!' : 'Prêt?'}
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

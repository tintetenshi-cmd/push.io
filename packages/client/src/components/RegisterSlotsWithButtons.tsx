import type { Player, Card } from '@roborally/shared';
import DropSlot from './DropSlot';
import { useGameStore } from '../hooks/useGameStore';
import { useState, useEffect } from 'react';
import { GamePhase } from '@roborally/shared';

interface RegisterSlotsWithButtonsProps {
  player: Player;
}

export default function RegisterSlotsWithButtons({ player }: RegisterSlotsWithButtonsProps): React.ReactElement {
  const { socket, gameState } = useGameStore();
  const [isReady, setIsReady] = useState(player.isReady ?? false);
  const [powerDown, setPowerDown] = useState(false);

  useEffect(() => {
    setIsReady(player.isReady ?? false);
  }, [player.isReady]);

  useEffect(() => {
    if (gameState.phase === GamePhase.PROGRAMMING) {
      setIsReady(false);
      setPowerDown(false);
    }
  }, [gameState.phase]);

  const filledRegisters = player.registers.filter((r: Card | null) => r !== null).length;
  const allFilled = filledRegisters === 5;

  const handleReady = () => {
    if (!socket || !allFilled) return;
    const newReadyState = !isReady;
    setIsReady(newReadyState);
    socket.emit('room:ready', newReadyState);
  };

  const handlePowerDown = () => {
    if (!socket) return;
    const newPowerDown = !powerDown;
    setPowerDown(newPowerDown);
    socket.emit('game:program', {
      registers: player.registers,
      powerDown: newPowerDown,
    });
  };

  return (
    <div className="bg-primary-800/50 rounded-xl p-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <h3 className="font-semibold mb-2 text-center text-sm">Registres (1-5)</h3>
          <div className="flex justify-center gap-2">
            {player.registers.map((card: Card | null, index: number) => (
              <DropSlot
                key={index}
                index={index}
                card={card}
                isLocked={player.robot?.lockedRegisters[index] ?? false}
                currentRegisters={player.registers}
              />
            ))}
          </div>
        </div>
        
        <div className="flex flex-col gap-2">
          <button
            onClick={handleReady}
            disabled={!allFilled}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              isReady
                ? 'bg-green-500/80 hover:bg-green-500 text-white'
                : allFilled
                  ? 'bg-primary-500 hover:bg-primary-400 text-white'
                  : 'bg-primary-700/50 text-primary-400 cursor-not-allowed'
            }`}
          >
            {isReady ? 'Prêt' : `Prêt (${filledRegisters}/5)`}
          </button>
          
          <button
            onClick={handlePowerDown}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              powerDown
                ? 'bg-yellow-500/80 hover:bg-yellow-500 text-white'
                : 'bg-primary-700 hover:bg-primary-600 text-white'
            }`}
          >
            {powerDown ? 'Power Down' : 'Power Down'}
          </button>
        </div>
      </div>
    </div>
  );
}

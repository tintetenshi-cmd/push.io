import React from 'react';
import { useDrop } from 'react-dnd';
import { Lock } from 'lucide-react';
import { useGameStore } from '../hooks/useGameStore';
import type { Card } from '@roborally/shared';

interface RegisterSlotsProps {
  player: {
    registers: (Card | null)[];
    robot: {
      lockedRegisters: boolean[];
    } | null;
  };
}

interface DropSlotProps {
  index: number;
  card: Card | null;
  isLocked: boolean;
  currentRegisters: (Card | null)[];
}

function DropSlot({ index, card, isLocked, currentRegisters }: DropSlotProps): React.ReactElement {
  const { socket } = useGameStore();

  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'CARD',
    drop: (item: { card: Card }) => {
      if (!socket || isLocked) return;
      // Create new registers array preserving existing cards
      const newRegisters = [...currentRegisters];
      newRegisters[index] = item.card;
      socket.emit('game:program', {
        registers: newRegisters,
        powerDown: false,
      });
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }));

  return (
    <div
      ref={isLocked ? null : drop}
      className={`card-slot ${isOver ? 'border-primary-400 bg-primary-700/50' : ''} ${
        isLocked ? 'bg-red-900/30 border-red-500' : ''
      }`}
    >
      {isLocked && <Lock className="w-5 h-5 text-red-400 absolute" />}
      {card && (
        <div className="card-filled">
          <div className="text-xs text-center">{card.type}</div>
          <div className="text-xs text-primary-400">#{card.priority}</div>
        </div>
      )}
      <div className="absolute -bottom-6 text-xs text-primary-400">{index + 1}</div>
    </div>
  );
}

export default function RegisterSlots({ player }: RegisterSlotsProps): React.ReactElement {
  // Debug: log current registers
  console.log('RegisterSlots registers:', player.registers.map((r, i) => `slot${i+1}: ${r?.type || 'empty'}`).join(', '));

  return (
    <div className="bg-primary-800/50 rounded-xl p-4">
      <h3 className="font-semibold mb-4 text-center">Registres (1-5)</h3>
      <div className="flex justify-center gap-4">
        {player.registers.map((card, index) => (
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
  );
}

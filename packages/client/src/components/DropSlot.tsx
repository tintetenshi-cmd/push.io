import { useDrop } from 'react-dnd';
import { Card } from '@roborally/shared';
import { Lock } from 'lucide-react';
import { useGameStore } from '../hooks/useGameStore';

interface DropSlotProps {
  index: number;
  card: Card | null;
  isLocked: boolean;
  currentRegisters: (Card | null)[];
}

export default function DropSlot({ index, card, isLocked, currentRegisters }: DropSlotProps): React.ReactElement {
  const { socket } = useGameStore();

  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'CARD',
    drop: (item: { card: Card }) => {
      if (!socket || isLocked) return;
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
  }), [socket, isLocked, index, currentRegisters]);

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

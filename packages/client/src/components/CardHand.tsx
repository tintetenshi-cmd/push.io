import React from 'react';
import { useDrag } from 'react-dnd';
import { Move, RotateCw, RotateCcw, ArrowLeft } from 'lucide-react';
import type { Card } from '@roborally/shared';

interface CardHandProps {
  player: {
    hand: Card[];
  };
}

const CARD_ICONS: Record<string, React.ReactNode> = {
  forward_1: <Move className="w-6 h-6" />,
  forward_2: <Move className="w-6 h-6" />,
  forward_3: <Move className="w-6 h-6" />,
  backup_1: <ArrowLeft className="w-6 h-6" />,
  backup_2: <ArrowLeft className="w-6 h-6" />,
  backup_3: <ArrowLeft className="w-6 h-6" />,
  rotate_left: <RotateCcw className="w-6 h-6" />,
  rotate_right: <RotateCw className="w-6 h-6" />,
  u_turn: <RotateCw className="w-6 h-6" />,
  power_down: <span className="text-xs">PD</span>,
};

const CARD_NAMES: Record<string, string> = {
  forward_1: 'Avancer 1',
  forward_2: 'Avancer 2',
  forward_3: 'Avancer 3',
  backup_1: 'Reculer 1',
  backup_2: 'Reculer 2',
  backup_3: 'Reculer 3',
  rotate_left: 'Gauche',
  rotate_right: 'Droite',
  u_turn: 'Demi-tour',
  power_down: 'Power Down',
};

function DraggableCard({ card, index }: { card: Card; index: number }): React.ReactElement {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'CARD',
    item: { card, index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  return (
    <div
      ref={drag}
      className={`card-hand ${isDragging ? 'opacity-50' : ''}`}
      style={{ cursor: 'grab' }}
    >
      <div className="text-primary-200 mb-1">{CARD_ICONS[card.type]}</div>
      <div className="text-xs text-center text-primary-300">{CARD_NAMES[card.type]}</div>
      <div className="text-xs text-primary-400 mt-1">#{card.priority}</div>
    </div>
  );
}

export default function CardHand({ player }: CardHandProps): React.ReactElement {
  return (
    <div className="bg-primary-800/50 rounded-xl p-4">
      <h3 className="font-semibold mb-3">Main ({player.hand.length} cartes)</h3>
      <div className="flex flex-wrap gap-2 justify-center">
        {player.hand.map((card, index) => (
          <DraggableCard key={card.id} card={card} index={index} />
        ))}
      </div>
    </div>
  );
}

import React from 'react';
import { useDrag } from 'react-dnd';
import { Move, RotateCw, RotateCcw, ArrowLeft } from 'lucide-react';
import type { Card } from '@roborally/shared';

interface CardHandProps {
  player: {
    hand: Card[];
    registers: (Card | null)[];
  };
}

// Get cards that are in registers (placed on board)
const getCardsInRegisters = (registers: (Card | null)[]): Card[] => {
  return registers.filter((r): r is Card => r !== null);
};

// Filter hand to show only cards not in registers
const getAvailableCards = (hand: Card[], registers: (Card | null)[]): Card[] => {
  const registerCardIds = new Set(getCardsInRegisters(registers).map((c) => c.id));
  return hand.filter((card) => !registerCardIds.has(card.id));
};

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
      className={`card-hand-compact ${isDragging ? 'opacity-50' : ''}`}
      style={{ cursor: 'grab' }}
    >
      <div className="text-primary-200">{CARD_ICONS[card.type]}</div>
      <div className="text-[10px] text-center text-primary-400">#{card.priority}</div>
    </div>
  );
}

export default function CardHand({ player }: CardHandProps): React.ReactElement {
  const availableCards = getAvailableCards(player.hand, player.registers);
  const placedCards = getCardsInRegisters(player.registers).length;

  return (
    <div className="bg-primary-800/50 rounded-xl p-2">
      <div className="flex items-center gap-3">
        <h3 className="font-semibold text-xs whitespace-nowrap">
          Main ({availableCards.length}/{availableCards.length + placedCards})
        </h3>
        <div className="flex gap-1 overflow-x-auto">
          {availableCards.map((card, index) => (
            <DraggableCard key={card.id} card={card} index={index} />
          ))}
        </div>
      </div>
    </div>
  );
}

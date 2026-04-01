import type { Player, Card } from '@roborally/shared';
import DropSlot from './DropSlot';
import { useGameStore } from '../hooks/useGameStore';
import { useState, useEffect } from 'react';
import { GamePhase } from '@roborally/shared';
import { ArrowUp, RotateCw, RotateCcw, ArrowLeft } from 'lucide-react';
import { useDrag } from 'react-dnd';

interface RegisterSlotsWithButtonsProps {
  player: Player;
}

const CARD_ICONS: Record<string, React.ReactElement> = {
  forward_1: <ArrowUp className="w-6 h-6" />,
  forward_2: (
    <div className="flex flex-col -space-y-2">
      <ArrowUp className="w-5 h-5" />
      <ArrowUp className="w-5 h-5" />
    </div>
  ),
  forward_3: (
    <div className="flex flex-col -space-y-2">
      <ArrowUp className="w-4 h-4" />
      <ArrowUp className="w-4 h-4" />
      <ArrowUp className="w-4 h-4" />
    </div>
  ),
  backup_1: <ArrowLeft className="w-6 h-6" />,
  backup_2: (
    <div className="flex flex-col -space-y-2">
      <ArrowLeft className="w-5 h-5" />
      <ArrowLeft className="w-5 h-5" />
    </div>
  ),
  backup_3: (
    <div className="flex flex-col -space-y-2">
      <ArrowLeft className="w-4 h-4" />
      <ArrowLeft className="w-4 h-4" />
      <ArrowLeft className="w-4 h-4" />
    </div>
  ),
  rotate_left: <RotateCcw className="w-6 h-6" />,
  rotate_right: <RotateCw className="w-6 h-6" />,
  u_turn: <RotateCw className="w-6 h-6" />,
  power_down: <span className="text-xs">PD</span>,
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
      <div className="text-primary-200">{CARD_ICONS[card.type]}</div>
      <div className="text-[10px] text-center text-primary-400">#{card.priority}</div>
    </div>
  );
}

function CardHandSection({ hand, registers }: { hand: Card[]; registers: (Card | null)[] }): React.ReactElement {
  const registerCardIds = new Set(registers.filter((r): r is Card => r !== null).map((c) => c.id));
  const availableCards = hand.filter((card) => !registerCardIds.has(card.id));
  const placedCards = registers.filter((r): r is Card => r !== null).length;

  return (
    <div className="flex-1">
      <h3 className="font-semibold mb-2 text-center text-sm">Main ({availableCards.length}/{availableCards.length + placedCards})</h3>
      <div className="flex justify-center gap-2 flex-wrap">
        {availableCards.map((card, index) => (
          <DraggableCard key={card.id} card={card} index={index} />
        ))}
      </div>
    </div>
  );
}

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
      <div className="flex items-center gap-4">
        {/* Main Section */}
        <CardHandSection hand={player.hand} registers={player.registers} />
        
        {/* Divider */}
        <div className="w-px h-24 bg-primary-600/50" />
        
        {/* Registers Section */}
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
        
        {/* Divider */}
        <div className="w-px h-16 bg-primary-600/50" />
        
        {/* Buttons Section */}
        <div className="flex flex-col gap-2">
          <button
            onClick={handleReady}
            disabled={!allFilled}
            className={`px-3 py-2 rounded-lg font-medium text-xs transition-all min-w-[80px] ${
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
            className={`px-3 py-2 rounded-lg font-medium text-xs transition-all min-w-[80px] ${
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

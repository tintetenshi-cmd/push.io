import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { Room, Player, Cell } from '@roborally/shared';
import { CellType, GamePhase, PhaseStep } from '@roborally/shared';
import { AVATAR_SVGS } from '../../utils/svgAvatars';
import { useGameStore } from '../../hooks/useGameStore';

interface GameCanvasProps {
  room: Room;
  players: Player[];
}

const CELL_SIZE = 50;
const MIN_SCALE = 0.3;
const MAX_SCALE = 5;

export default function GameCanvas({ room, players }: GameCanvasProps): React.ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const avatarImagesRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const { gameState } = useGameStore();

  // Track previous robot positions for animation
  const prevPositionsRef = useRef<Map<string, { x: number; y: number; direction: number }>>(new Map());
  const animationProgressRef = useRef<number>(0);

  // Track previous positions when they change
  useEffect(() => {
    players.forEach((player) => {
      if (player.robot) {
        const prev = prevPositionsRef.current.get(player.id);
        const current = { x: player.robot.x, y: player.robot.y, direction: player.robot.direction };

        if (prev && (prev.x !== current.x || prev.y !== current.y)) {
          console.log(`Robot ${player.name} moved from (${prev.x},${prev.y}) to (${current.x},${current.y})`);
        }

        prevPositionsRef.current.set(player.id, current);
      }
    });
  }, [players]);

  // Update animation progress
  useEffect(() => {
    animationProgressRef.current = gameState.stepProgress / 100;
  }, [gameState.stepProgress]);

  const mapSize = room.mapSize;
  const board = room.board;
  const boardPixelSize = mapSize * CELL_SIZE;

  // Calculate initial centering offset
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    
    // Calculate scale to fit the board in the container with some padding
    const padding = 40;
    const scaleX = (containerWidth - padding * 2) / boardPixelSize;
    const scaleY = (containerHeight - padding * 2) / boardPixelSize;
    const fitScale = Math.min(scaleX, scaleY, 1); // Don't scale up beyond 1
    
    setScale(Math.max(fitScale, 0.5)); // Minimum scale 0.5
    
    // Center the board
    const scaledBoardSize = boardPixelSize * fitScale;
    const centerX = (containerWidth - scaledBoardSize) / 2;
    const centerY = (containerHeight - scaledBoardSize) / 2;
    
    setOffset({ x: centerX, y: centerY });
  }, [boardPixelSize, mapSize]);

  useEffect(() => {
    const loadAvatars = async (): Promise<void> => {
      const avatars = new Map<string, HTMLImageElement>();
      for (const player of players) {
        if (player.avatar && !avatars.has(player.avatar)) {
          const img = new Image();
          img.src = AVATAR_SVGS[player.avatar as keyof typeof AVATAR_SVGS];
          await new Promise<void>((resolve) => {
            img.onload = () => resolve();
          });
          avatars.set(player.avatar, img);
        }
      }
      avatarImagesRef.current = avatars;
    };
    loadAvatars();
  }, [players]);

  const drawBoard = useCallback((ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void => {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
    ctx.scale(dpr, dpr);

    ctx.fillStyle = '#1e1b4b';
    ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);

    ctx.save();
    ctx.translate(offset.x, offset.y);
    ctx.scale(scale, scale);

    const boardHeight = board.length;
    const startCol = Math.max(0, Math.floor(-offset.x / (CELL_SIZE * scale)));
    const endCol = Math.min(mapSize, Math.ceil((canvas.clientWidth - offset.x) / (CELL_SIZE * scale)));
    const startRow = Math.max(0, Math.floor(-offset.y / (CELL_SIZE * scale)));
    const endRow = Math.min(boardHeight, Math.ceil((canvas.clientHeight - offset.y) / (CELL_SIZE * scale)));

    // Draw spawn zone background (first 3 rows)
    if (startRow < 3) {
      ctx.fillStyle = 'rgba(59, 130, 246, 0.15)'; // Light blue tint for spawn zone
      ctx.fillRect(0, 0, mapSize * CELL_SIZE, 3 * CELL_SIZE);
      
      // Draw spawn zone border
      ctx.strokeStyle = '#3B82F6';
      ctx.lineWidth = 2;
      ctx.strokeRect(0, 0, mapSize * CELL_SIZE, 3 * CELL_SIZE);
      
      // Draw "SPAWN" label
      ctx.fillStyle = '#3B82F6';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SPAWN ZONE', (mapSize * CELL_SIZE) / 2, 1.5 * CELL_SIZE + 4);
    }

    for (let row = startRow; row < endRow; row++) {
      for (let col = startCol; col < endCol; col++) {
        const cell = board[row]?.[col];
        if (!cell) continue;

        const x = col * CELL_SIZE;
        const y = row * CELL_SIZE;

        ctx.fillStyle = getCellColor(cell.type);
        ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);

        ctx.strokeStyle = '#444';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, CELL_SIZE, CELL_SIZE);

        drawCellContent(ctx, cell, x, y);
      }
    }

    for (const player of players) {
      if (player.robot && !player.robot.destroyed) {
        // During resolution phase with MOVE_ROBOTS step, interpolate positions
        let interpX = player.robot.x;
        let interpY = player.robot.y;
        let interpDir = player.robot.direction;

        if (gameState.phase === GamePhase.RESOLUTION && gameState.currentStep === PhaseStep.MOVE_ROBOTS) {
          const prev = prevPositionsRef.current.get(player.id);
          if (prev) {
            const progress = animationProgressRef.current;
            interpX = prev.x + (player.robot.x - prev.x) * progress;
            interpY = prev.y + (player.robot.y - prev.y) * progress;
            const dirDiff = player.robot.direction - prev.direction;
            interpDir = prev.direction + dirDiff * progress;
          }
        }

        drawRobot(ctx, player, interpX, interpY, interpDir);
      }
    }

    ctx.restore();
  }, [board, mapSize, offset, scale, players]);

  // Force canvas redraw when players change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    drawBoard(ctx, canvas);
  }, [drawBoard, players]);

  const handleWheel = (e: React.WheelEvent): void => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale * delta));
    setScale(newScale);
  };

  const handleMouseDown = (e: React.MouseEvent): void => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent): void => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = (): void => {
    setIsDragging(false);
  };

  return (
    <div ref={containerRef} className="w-full h-full relative overflow-hidden">
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-move"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ touchAction: 'none' }}
      />
      <div className="absolute bottom-4 left-4 bg-primary-800/80 rounded-lg p-2 text-sm">
        <div>Zoom: {(scale * 100).toFixed(0)}%</div>
        <div className="text-xs text-primary-400">Molette pour zoomer</div>
      </div>
    </div>
  );
}

function getCellColor(type: CellType): string {
  switch (type) {
    case CellType.WALL:
      return '#555555';  // Gray walls
    case CellType.CONVEYOR_NORMAL:
      return '#8B7355';  // Brownish for normal conveyor
    case CellType.CONVEYOR_EXPRESS:
      return '#D4A574';  // Lighter brown for express
    case CellType.GEAR_LEFT:
    case CellType.GEAR_RIGHT:
      return '#8FBC8F';  // Green for gears
    case CellType.PUSHER_NORTH:
    case CellType.PUSHER_SOUTH:
    case CellType.PUSHER_EAST:
    case CellType.PUSHER_WEST:
      return '#CD5C5C';  // Red for pushers
    case CellType.PIT:
      return '#1a1a1a';  // Very dark for pit
    case CellType.LASER:
      return '#FFB6C1';  // Light pink for laser
    case CellType.FLAG_1:
      return '#DC2626';  // Red flag
    case CellType.FLAG_2:
      return '#16A34A';  // Green flag
    case CellType.FLAG_3:
      return '#2563EB';  // Blue flag
    case CellType.FLAG_4:
      return '#9333EA';  // Purple flag
    case CellType.FLAG_5:
      return '#EA580C';  // Orange flag
    case CellType.ARCHIVE:
      return '#F59E0B';  // Amber for archive
    default:
      return '#E5E7EB';  // Light gray for empty
  }
}

function drawCellContent(ctx: CanvasRenderingContext2D, cell: Cell, x: number, y: number): void {
  const centerX = x + CELL_SIZE / 2;
  const centerY = y + CELL_SIZE / 2;
  const size = CELL_SIZE;

  // Draw grid lines for empty cells
  if (cell.type === CellType.EMPTY) {
    ctx.strokeStyle = '#D1D5DB';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, size, size);
    return;
  }

  // WALL: Draw brick pattern
  if (cell.type === CellType.WALL) {
    ctx.fillStyle = '#374151';
    ctx.fillRect(x + 2, y + 2, size - 4, size - 4);
    ctx.strokeStyle = '#6B7280';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 2, y + 2, size - 4, size - 4);
    // Brick lines
    ctx.beginPath();
    ctx.moveTo(x + size / 2, y + 2);
    ctx.lineTo(x + size / 2, y + size - 2);
    ctx.moveTo(x + 2, y + size / 2);
    ctx.lineTo(x + size - 2, y + size / 2);
    ctx.stroke();
    return;
  }

  // PIT: Draw dark hole with warning border
  if (cell.type === CellType.PIT) {
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(centerX, centerY, size * 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#DC2626';
    ctx.lineWidth = 2;
    ctx.stroke();
    return;
  }

  // CONVEYOR: Draw direction arrow
  if ((cell.type === CellType.CONVEYOR_NORMAL || cell.type === CellType.CONVEYOR_EXPRESS) && cell.direction !== undefined) {
    ctx.save();
    ctx.translate(centerX, centerY);
    const rotation = (cell.direction - 90) * (Math.PI / 180);
    ctx.rotate(rotation);
    
    // Arrow body
    ctx.fillStyle = cell.type === CellType.CONVEYOR_EXPRESS ? '#92400E' : '#78350F';
    ctx.fillRect(-size * 0.3, -size * 0.1, size * 0.6, size * 0.2);
    
    // Arrow head
    ctx.beginPath();
    ctx.moveTo(size * 0.3, -size * 0.2);
    ctx.lineTo(size * 0.45, 0);
    ctx.lineTo(size * 0.3, size * 0.2);
    ctx.closePath();
    ctx.fill();
    
    ctx.restore();
    return;
  }

  // GEAR: Draw rotation indicator
  if (cell.type === CellType.GEAR_LEFT || cell.type === CellType.GEAR_RIGHT) {
    ctx.strokeStyle = '#166534';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(centerX, centerY, size * 0.25, 0, Math.PI * 1.5);
    ctx.stroke();
    // Arrow indicating rotation direction
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(cell.type === CellType.GEAR_LEFT ? -Math.PI / 4 : Math.PI / 4);
    ctx.fillStyle = '#166534';
    ctx.beginPath();
    ctx.moveTo(size * 0.25, -5);
    ctx.lineTo(size * 0.25 + 8, 0);
    ctx.lineTo(size * 0.25, 5);
    ctx.fill();
    ctx.restore();
    return;
  }

  // LASER: Draw laser beam indicator
  if (cell.type === CellType.LASER && cell.direction !== undefined) {
    ctx.fillStyle = '#DC2626';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 6, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.strokeStyle = '#DC2626';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    const endX = centerX + Math.cos((cell.direction * Math.PI) / 180) * (size / 2 - 4);
    const endY = centerY + Math.sin((cell.direction * Math.PI) / 180) * (size / 2 - 4);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    return;
  }

  // FLAGS: Draw flag number
  if (cell.type.startsWith('flag')) {
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const flagNum = cell.type.split('_')[1];
    ctx.fillText(flagNum ?? '?', centerX, centerY);
    return;
  }

  // ARCHIVE: Draw spawn indicator
  if (cell.type === CellType.ARCHIVE) {
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⚑', centerX, centerY);
  }
}

function drawRobot(
  ctx: CanvasRenderingContext2D,
  player: Player,
  interpolatedX?: number,
  interpolatedY?: number,
  interpolatedDirection?: number
): void {
  if (!player.robot) return;

  const { x, y, direction } = player.robot;
  const renderX = interpolatedX !== undefined ? interpolatedX : x;
  const renderY = interpolatedY !== undefined ? interpolatedY : y;
  const renderDirection = interpolatedDirection !== undefined ? interpolatedDirection : direction;

  const pixelX = renderX * CELL_SIZE;
  const pixelY = renderY * CELL_SIZE;
  const centerX = pixelX + CELL_SIZE / 2;
  const centerY = pixelY + CELL_SIZE / 2;
  const radius = CELL_SIZE * 0.35;

  ctx.save();
  ctx.translate(centerX, centerY);
  // Arrow drawn pointing right (0°)
  // Game North(0°) → arrow up (-90° canvas) = 0 - 90 = -90 ✓
  // Game East(90°) → arrow right (0° canvas) = 90 - 90 = 0 ✓
  // Game South(180°) → arrow down (90° canvas) = 180 - 90 = 90 ✓
  // Game West(270°) → arrow left (180° canvas) = 270 - 90 = 180 ✓
  const canvasRotation = (renderDirection - 90) * (Math.PI / 180);
  ctx.rotate(canvasRotation);

  ctx.fillStyle = player.color;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.moveTo(radius * 0.7, 0);
  ctx.lineTo(-radius * 0.3, radius * 0.4);
  ctx.lineTo(-radius * 0.3, -radius * 0.4);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

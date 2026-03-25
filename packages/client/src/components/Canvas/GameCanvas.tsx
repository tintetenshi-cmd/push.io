import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { Room, Player, Cell, Direction } from '@roborally/shared';
import { CellType } from '@roborally/shared';
import { AVATAR_SVGS } from '../../utils/svgAvatars';

interface GameCanvasProps {
  room: Room;
  players: Player[];
}

const CELL_SIZE = 40;
const MIN_SCALE = 0.5;
const MAX_SCALE = 3;

export default function GameCanvas({ room, players }: GameCanvasProps): React.ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const avatarImagesRef = useRef<Map<string, HTMLImageElement>>(new Map());

  const mapSize = room.mapSize;
  const board = room.board;

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

    const startCol = Math.max(0, Math.floor(-offset.x / (CELL_SIZE * scale)));
    const endCol = Math.min(mapSize, Math.ceil((canvas.clientWidth - offset.x) / (CELL_SIZE * scale)));
    const startRow = Math.max(0, Math.floor(-offset.y / (CELL_SIZE * scale)));
    const endRow = Math.min(mapSize, Math.ceil((canvas.clientHeight - offset.y) / (CELL_SIZE * scale)));

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
        drawRobot(ctx, player);
      }
    }

    ctx.restore();
  }, [board, mapSize, offset, scale, players]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    drawBoard(ctx, canvas);
  }, [drawBoard]);

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
      return '#333';
    case CellType.CONVEYOR_NORMAL:
      return '#4a5568';
    case CellType.CONVEYOR_EXPRESS:
      return '#2d3748';
    case CellType.GEAR_LEFT:
      return '#553c3c';
    case CellType.GEAR_RIGHT:
      return '#3c553c';
    case CellType.PUSHER_NORTH:
    case CellType.PUSHER_SOUTH:
    case CellType.PUSHER_EAST:
    case CellType.PUSHER_WEST:
      return '#553c55';
    case CellType.PIT:
      return '#000';
    case CellType.LASER:
      return '#3c3c55';
    case CellType.FLAG_1:
      return '#7c2d12';
    case CellType.FLAG_2:
      return '#166534';
    case CellType.FLAG_3:
      return '#1e40af';
    case CellType.FLAG_4:
      return '#7c3aed';
    case CellType.FLAG_5:
      return '#be123c';
    case CellType.ARCHIVE:
      return '#854d0e';
    default:
      return '#1e1b4b';
  }
}

function drawCellContent(ctx: CanvasRenderingContext2D, cell: Cell, x: number, y: number): void {
  const centerX = x + CELL_SIZE / 2;
  const centerY = y + CELL_SIZE / 2;

  if (cell.type === CellType.LASER && cell.direction !== undefined) {
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    const endX = centerX + Math.cos((cell.direction * Math.PI) / 180) * (CELL_SIZE / 2 - 2);
    const endY = centerY + Math.sin((cell.direction * Math.PI) / 180) * (CELL_SIZE / 2 - 2);
    ctx.lineTo(endX, endY);
    ctx.stroke();
  }

  if (cell.type.startsWith('flag')) {
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const flagNum = cell.type.split('_')[1];
    ctx.fillText(flagNum ?? '?', centerX, centerY);
  }
}

function drawRobot(ctx: CanvasRenderingContext2D, player: Player): void {
  if (!player.robot) return;

  const { x, y, direction, color } = player.robot;
  const pixelX = x * CELL_SIZE;
  const pixelY = y * CELL_SIZE;
  const centerX = pixelX + CELL_SIZE / 2;
  const centerY = pixelY + CELL_SIZE / 2;
  const radius = CELL_SIZE * 0.35;

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate((direction * Math.PI) / 180);

  ctx.fillStyle = color;
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

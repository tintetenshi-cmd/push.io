import type { Direction, Position, Room, Robot } from '@roborally/shared';
import { Direction as D } from '@roborally/shared';

export function raycastLOS(
  room: Room,
  startX: number,
  startY: number,
  direction: Direction,
  maxDistance: number = Infinity
): { hit: boolean; target: Robot | null; distance: number } {
  const dx = direction === D.EAST ? 1 : direction === D.WEST ? -1 : 0;
  const dy = direction === D.SOUTH ? 1 : direction === D.NORTH ? -1 : 0;

  let x = startX + dx;
  let y = startY + dy;
  let distance = 1;

  while (
    x >= 0 &&
    x < room.mapSize &&
    y >= 0 &&
    y < room.mapSize &&
    distance <= maxDistance
  ) {
    const cell = room.board[y][x];
    if (cell.type === 'wall') {
      return { hit: true, target: null, distance };
    }

    for (const player of room.players.values()) {
      if (player.robot && player.robot.x === x && player.robot.y === y && !player.robot.destroyed) {
        return { hit: true, target: player.robot, distance };
      }
    }

    x += dx;
    y += dy;
    distance++;
  }

  return { hit: false, target: null, distance: distance - 1 };
}

export function pushChain(
  room: Room,
  robot: Robot,
  dx: number,
  dy: number,
  depth: number = 0
): boolean {
  if (depth > 10) return false;

  const newX = robot.x + dx;
  const newY = robot.y + dy;

  if (newX < 0 || newX >= room.mapSize || newY < 0 || newY >= room.mapSize) {
    return false;
  }

  const cell = room.board[newY][newX];
  if (cell.type === 'wall') {
    return false;
  }

  for (const player of room.players.values()) {
    if (
      player.robot &&
      player.robot !== robot &&
      player.robot.x === newX &&
      player.robot.y === newY &&
      !player.robot.destroyed
    ) {
      if (!pushChain(room, player.robot, dx, dy, depth + 1)) {
        return false;
      }
    }
  }

  robot.x = newX;
  robot.y = newY;

  if (cell.type === 'pit') {
    destroyRobot(room, robot);
  }

  return true;
}

export function destroyRobot(room: Room, robot: Robot): void {
  robot.lives--;
  robot.damage = 0;
  robot.destroyed = true;

  if (robot.lives > 0) {
    setTimeout(() => {
      respawnRobot(robot);
    }, 1000);
  }
}

export function respawnRobot(robot: Robot): void {
  robot.x = robot.archiveX;
  robot.y = robot.archiveY;
  robot.direction = robot.archiveDirection;
  robot.destroyed = false;
}

export function getDirectionDelta(direction: Direction): { dx: number; dy: number } {
  switch (direction) {
    case D.NORTH:
      return { dx: 0, dy: -1 };
    case D.EAST:
      return { dx: 1, dy: 0 };
    case D.SOUTH:
      return { dx: 0, dy: 1 };
    case D.WEST:
      return { dx: -1, dy: 0 };
    default:
      return { dx: 0, dy: 0 };
  }
}

export function turnDirection(direction: Direction, turn: 'left' | 'right' | 'uturn'): Direction {
  switch (turn) {
    case 'left':
      return ((direction + 270) % 360) as Direction;
    case 'right':
      return ((direction + 90) % 360) as Direction;
    case 'uturn':
      return ((direction + 180) % 360) as Direction;
    default:
      return direction;
  }
}

export function getDistance(a: Position, b: Position): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

export function isValidPosition(room: Room, x: number, y: number): boolean {
  return x >= 0 && x < room.mapSize && y >= 0 && y < room.mapSize;
}

export function sanitizeChatMessage(message: string): string {
  return message
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .slice(0, 200);
}

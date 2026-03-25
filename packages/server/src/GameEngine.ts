import { Cell, Position, Direction, Robot, Room } from '@roborally/shared';
import { CellType, GamePhase, CardType, CARD_PRIORITIES } from '@roborally/shared';

const WALL_PROBABILITY = 0.20;
const CONVEYOR_PROBABILITY = 0.15;
const LASER_PROBABILITY = 0.10;
const GEAR_PROBABILITY = 0.08;
const PUSHER_PROBABILITY = 0.05;
const PIT_PROBABILITY = 0.03;

export function generateMap(size: number): Cell[][] {
  const board: Cell[][] = [];

  for (let y = 0; y < size; y++) {
    const row: Cell[] = [];
    for (let x = 0; x < size; x++) {
      let cell: Cell = { type: CellType.EMPTY };

      if (y === 0 || y === size - 1 || x === 0 || x === size - 1) {
        cell = { type: CellType.WALL };
      } else {
        const rand = Math.random();
        let cumulative = 0;

        cumulative += WALL_PROBABILITY;
        if (rand < cumulative && !hasWallCluster(board, x, y)) {
          cell = { type: CellType.WALL };
        } else {
          cumulative += CONVEYOR_PROBABILITY;
          if (rand < cumulative) {
            const directions = [Direction.NORTH, Direction.EAST, Direction.SOUTH, Direction.WEST];
            const isExpress = Math.random() < 0.5;
            cell = {
              type: isExpress ? CellType.CONVEYOR_EXPRESS : CellType.CONVEYOR_NORMAL,
              direction: directions[Math.floor(Math.random() * directions.length)] as Direction,
            };
          } else {
            cumulative += LASER_PROBABILITY;
            if (rand < cumulative) {
              const directions = [Direction.NORTH, Direction.EAST, Direction.SOUTH, Direction.WEST];
              cell = {
                type: CellType.LASER,
                direction: directions[Math.floor(Math.random() * directions.length)] as Direction,
              };
            } else {
              cumulative += GEAR_PROBABILITY;
              if (rand < cumulative) {
                cell = {
                  type: Math.random() < 0.5 ? CellType.GEAR_LEFT : CellType.GEAR_RIGHT,
                };
              } else {
                cumulative += PUSHER_PROBABILITY;
                if (rand < cumulative) {
                  const pusherTypes = [
                    CellType.PUSHER_NORTH,
                    CellType.PUSHER_SOUTH,
                    CellType.PUSHER_EAST,
                    CellType.PUSHER_WEST,
                  ];
                  const pusherType = pusherTypes[Math.floor(Math.random() * pusherTypes.length)];
                  cell = { type: pusherType! };
                } else {
                  cumulative += PIT_PROBABILITY;
                  if (rand < cumulative) {
                    cell = { type: CellType.PIT };
                  }
                }
              }
            }
          }
        }
      }

      row.push(cell);
    }
    board.push(row);
  }

  const flagPositions = placeFlags(board, size);
  const firstPos = flagPositions[0];
  if (firstPos) {
    const archiveX = firstPos.x;
    const archiveY = firstPos.y;
    if (archiveY >= 0 && archiveY < board.length) {
      const row = board[archiveY];
      if (row && archiveX >= 0 && archiveX < row.length) {
        row[archiveX] = { type: CellType.ARCHIVE };
      }
    }
  }

  return board;
}

function hasWallCluster(board: Cell[][], x: number, y: number): boolean {
  let wallCount = 0;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const ny = y + dy;
      const nx = x + dx;
      const firstRow = board[0];
      if (ny >= 0 && ny < board.length && nx >= 0 && nx < (firstRow?.length ?? 0)) {
        const row = board[ny];
        if (row) {
          const cell = row[nx];
          if (cell?.type === CellType.WALL) wallCount++;
        }
      }
    }
  }
  return wallCount >= 4;
}

function placeFlags(board: Cell[][], size: number): Position[] {
  const flags: Position[] = [];
  const flagTypes = [
    CellType.FLAG_1,
    CellType.FLAG_2,
    CellType.FLAG_3,
    CellType.FLAG_4,
    CellType.FLAG_5,
  ];

  for (let i = 0; i < 5; i++) {
    let placed = false;
    let attempts = 0;
    while (!placed && attempts < 100) {
      const x = Math.floor(Math.random() * (size - 2)) + 1;
      const y = Math.floor(Math.random() * (size - 2)) + 1;

      const row = board[y];
      if (!row) continue;
      const cell = row[x];
      if (cell && cell.type === CellType.EMPTY && isPathConnected(board, flags, { x, y })) {
      const flagType = flagTypes[i];
      if (flagType) {
        row[x] = { type: flagType };
      }
        flags.push({ x, y });
        placed = true;
      }
      attempts++;
    }
  }

  return flags;
}

function isPathConnected(board: Cell[][], existingFlags: Position[], newPos: Position): boolean {
  if (existingFlags.length === 0) return true;

  const lastFlag = existingFlags[existingFlags.length - 1]!;
  return aStar(board, lastFlag, newPos) !== null;
}

function aStar(board: Cell[][], start: Position, goal: Position): Position[] | null {
  const openSet: Position[] = [start];
  const cameFrom = new Map<string, Position>();
  const gScore = new Map<string, number>();
  const fScore = new Map<string, number>();

  gScore.set(`${start.x},${start.y}`, 0);
  fScore.set(`${start.x},${start.y}`, heuristic(start, goal));

  while (openSet.length > 0) {
    let current: Position = openSet[0]!;
    let lowestF = fScore.get(`${current.x},${current.y}`) ?? Infinity;

    for (const pos of openSet) {
      const f = fScore.get(`${pos.x},${pos.y}`) ?? Infinity;
      if (f < lowestF) {
        lowestF = f;
        current = pos;
      }
    }

    if (current!.x === goal.x && current!.y === goal.y) {
      return reconstructPath(cameFrom, current!);
    }

    openSet.splice(openSet.indexOf(current!), 1);

    for (const neighbor of getNeighbors(board, current)) {
      const tentativeG = (gScore.get(`${current.x},${current.y}`) ?? Infinity) + 1;
      const neighborKey = `${neighbor.x},${neighbor.y}`;

      if (tentativeG < (gScore.get(neighborKey) ?? Infinity)) {
        cameFrom.set(neighborKey, current!);
        gScore.set(neighborKey, tentativeG);
        fScore.set(neighborKey, tentativeG + heuristic(neighbor, goal));

        if (!openSet.some(p => p.x === neighbor.x && p.y === neighbor.y)) {
          openSet.push(neighbor);
        }
      }
    }
  }

  return null;
}

function heuristic(a: Position, b: Position): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function getNeighbors(board: Cell[][], pos: Position): Position[] {
  const neighbors: Position[] = [];
  const directions = [
    { x: 0, y: -1 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
  ];

  for (const dir of directions) {
    const nx = pos.x + dir.x;
    const ny = pos.y + dir.y;

    const firstRow = board[0];
    if (ny >= 0 && ny < board.length && nx >= 0 && nx < (firstRow?.length ?? 0)) {
      const row = board[ny];
      if (row) {
        const cell = row[nx];
        if (cell && cell.type !== CellType.WALL && cell.type !== CellType.PIT) {
          neighbors.push({ x: nx, y: ny });
        }
      }
    }
  }

  return neighbors;
}

function reconstructPath(cameFrom: Map<string, Position>, current: Position): Position[] {
  const path = [current];
  let key = `${current.x},${current.y}`;

  while (cameFrom.has(key)) {
    current = cameFrom.get(key)!;
    path.unshift(current);
    key = `${current.x},${current.y}`;
  }

  return path;
}

export function executePhase(room: Room, phaseNumber: number): void {
  const players = Array.from(room.players.values()).filter(p => p.robot && !p.robot.destroyed);

  const sortedPlayers = players.sort((a, b) => {
    const cardA = a.registers[phaseNumber - 1];
    const cardB = b.registers[phaseNumber - 1];

    if (!cardA && !cardB) return 0;
    if (!cardA) return 1;
    if (!cardB) return -1;

    const prioA = CARD_PRIORITIES[cardA.type] * 1000 + cardA.priority;
    const prioB = CARD_PRIORITIES[cardB.type] * 1000 + cardB.priority;

    return prioA - prioB;
  });

  for (const player of sortedPlayers) {
    const robot = player.robot;
    if (!robot || robot.powerDown) continue;

    const card = player.registers[phaseNumber - 1];
    if (!card) continue;

    executeCard(robot, card.type, room);
  }

  executeBoardElements(room);
  fireLasers(room);
  checkCheckpoints(room);
  cleanupPhase(room);
}

function executeCard(robot: Robot, cardType: CardType, room: Room): void {
  switch (cardType) {
    case CardType.FORWARD_1:
      moveRobot(robot, 1, room);
      break;
    case CardType.FORWARD_2:
      moveRobot(robot, 1, room);
      moveRobot(robot, 1, room);
      break;
    case CardType.FORWARD_3:
      moveRobot(robot, 1, room);
      moveRobot(robot, 1, room);
      moveRobot(robot, 1, room);
      break;
    case CardType.BACKUP_1:
    case CardType.BACKUP_2:
    case CardType.BACKUP_3:
      moveRobot(robot, -1, room);
      break;
    case CardType.ROTATE_LEFT:
      robot.direction = (robot.direction + 270) % 360 as Direction;
      break;
    case CardType.ROTATE_RIGHT:
      robot.direction = (robot.direction + 90) % 360 as Direction;
      break;
    case CardType.U_TURN:
      robot.direction = (robot.direction + 180) % 360 as Direction;
      break;
    case CardType.POWER_DOWN:
      break;
  }
}

function moveRobot(robot: Robot, distance: number, room: Room): void {
  const dx = distance > 0
    ? (robot.direction === Direction.EAST ? 1 : robot.direction === Direction.WEST ? -1 : 0)
    : (robot.direction === Direction.EAST ? -1 : robot.direction === Direction.WEST ? 1 : 0);
  const dy = distance > 0
    ? (robot.direction === Direction.SOUTH ? 1 : robot.direction === Direction.NORTH ? -1 : 0)
    : (robot.direction === Direction.SOUTH ? -1 : robot.direction === Direction.NORTH ? 1 : 0);

  const newX = robot.x + dx;
  const newY = robot.y + dy;

  if (newX < 0 || newX >= room.mapSize || newY < 0 || newY >= room.mapSize) {
    handleFall(robot, room);
    return;
  }

  const row = room.board[newY];
  if (!row) {
    handleFall(robot, room);
    return;
  }
  const targetCell = row[newX];
  if (!targetCell) {
    handleFall(robot, room);
    return;
  }
  if (targetCell.type === CellType.WALL) {
    return;
  }

  const targetRobot = findRobotAt(room, newX, newY);
  if (targetRobot) {
    if (pushChain(room, targetRobot, dx, dy, 0)) {
      robot.x = newX;
      robot.y = newY;
    }
  } else {
    robot.x = newX;
    robot.y = newY;
  }

  if (targetCell.type === CellType.PIT) {
    handleFall(robot, room);
  }
}

function pushChain(room: Room, robot: Robot, dx: number, dy: number, depth: number): boolean {
  if (depth > 10) return false;

  const newX = robot.x + dx;
  const newY = robot.y + dy;

  if (newX < 0 || newX >= room.mapSize || newY < 0 || newY >= room.mapSize) {
    handleFall(robot, room);
    return true;
  }

  const row = room.board[newY];
  if (!row) {
    handleFall(robot, room);
    return true;
  }
  const targetCell = row[newX];
  if (!targetCell) {
    handleFall(robot, room);
    return true;
  }
  if (targetCell.type === CellType.WALL) {
    return false;
  }

  const targetRobot = findRobotAt(room, newX, newY);
  if (targetRobot) {
    if (!pushChain(room, targetRobot, dx, dy, depth + 1)) {
      return false;
    }
  }

  robot.x = newX;
  robot.y = newY;

  if (targetCell.type === CellType.PIT) {
    handleFall(robot, room);
  }

  return true;
}

function findRobotAt(room: Room, x: number, y: number): Robot | null {
  for (const player of room.players.values()) {
    if (player.robot && player.robot.x === x && player.robot.y === y && !player.robot.destroyed) {
      return player.robot;
    }
  }
  return null;
}

function handleFall(robot: Robot, _room: Room): void {
  robot.lives--;
  robot.damage = 0;
  robot.destroyed = true;

  if (robot.lives > 0) {
    setTimeout(() => {
      robot.x = robot.archiveX;
      robot.y = robot.archiveY;
      robot.direction = robot.archiveDirection;
      robot.destroyed = false;
    }, 1000);
  }
}

function executeBoardElements(room: Room): void {
  for (const player of room.players.values()) {
    const robot = player.robot;
    if (!robot || robot.destroyed) continue;

    const row = room.board[robot.y];
    if (!row) continue;
    const cell = row[robot.x];
    if (!cell) continue;

    switch (cell.type) {
      case CellType.CONVEYOR_NORMAL:
      case CellType.CONVEYOR_EXPRESS:
        if (cell.direction !== undefined) {
          moveConveyor(robot, cell.direction, room, cell.type === CellType.CONVEYOR_EXPRESS ? 3 : 1);
        }
        break;
      case CellType.GEAR_LEFT:
        robot.direction = (robot.direction + 270) % 360 as Direction;
        break;
      case CellType.GEAR_RIGHT:
        robot.direction = (robot.direction + 90) % 360 as Direction;
        break;
      case CellType.PUSHER_NORTH:
        pushChain(room, robot, 0, -1, 0);
        break;
      case CellType.PUSHER_SOUTH:
        pushChain(room, robot, 0, 1, 0);
        break;
      case CellType.PUSHER_EAST:
        pushChain(room, robot, 1, 0, 0);
        break;
      case CellType.PUSHER_WEST:
        pushChain(room, robot, -1, 0, 0);
        break;
      case CellType.PIT:
        handleFall(robot, room);
        break;
    }
  }
}

function moveConveyor(robot: Robot, direction: Direction, room: Room, speed: number): void {
  const dx = direction === Direction.EAST ? 1 : direction === Direction.WEST ? -1 : 0;
  const dy = direction === Direction.SOUTH ? 1 : direction === Direction.NORTH ? -1 : 0;

  for (let i = 0; i < speed; i++) {
    const newX = robot.x + dx;
    const newY = robot.y + dy;

    if (newX < 0 || newX >= room.mapSize || newY < 0 || newY >= room.mapSize) {
      handleFall(robot, room);
      return;
    }

    const row = room.board[newY];
    if (!row) {
      handleFall(robot, room);
      return;
    }
    const targetCell = row[newX];
    if (!targetCell || targetCell.type === CellType.WALL) return;

    const targetRobot = findRobotAt(room, newX, newY);
    if (targetRobot) {
      if (!pushChain(room, targetRobot, dx, dy, 0)) return;
    }

    robot.x = newX;
    robot.y = newY;

    if (targetCell.type === CellType.PIT) {
      handleFall(robot, room);
      return;
    }

    const currentRow = room.board[robot.y];
    if (!currentRow) {
      handleFall(robot, room);
      return;
    }
    const newCell = currentRow[robot.x];
    if (!newCell) {
      handleFall(robot, room);
      return;
    }
    if ((newCell.type === CellType.CONVEYOR_NORMAL || newCell.type === CellType.CONVEYOR_EXPRESS) &&
        newCell.direction !== undefined && newCell.direction !== direction) {
      const turn = (newCell.direction - direction + 360) % 360;
      if (turn === 90) {
        robot.direction = (robot.direction + 90) % 360 as Direction;
      } else if (turn === 270) {
        robot.direction = (robot.direction + 270) % 360 as Direction;
      }
    }
  }
}

function fireLasers(room: Room): void {
  for (const player of room.players.values()) {
    const robot = player.robot;
    if (!robot || robot.destroyed) continue;

    fireRobotLaser(robot, room);
  }

  for (const laser of room.lasers) {
    fireBoardLaser(laser.x, laser.y, laser.direction, laser.count, room);
  }
}

function fireRobotLaser(robot: Robot, room: Room): void {
  const dx = robot.direction === Direction.EAST ? 1 : robot.direction === Direction.WEST ? -1 : 0;
  const dy = robot.direction === Direction.SOUTH ? 1 : robot.direction === Direction.NORTH ? -1 : 0;

  let x = robot.x + dx;
  let y = robot.y + dy;

  while (x >= 0 && x < room.mapSize && y >= 0 && y < room.mapSize) {
    const row = room.board[y];
    if (!row) return;
    const cell = row[x];
    if (!cell) return;
    if (cell.type === CellType.WALL) return;

    const targetRobot = findRobotAt(room, x, y);
    if (targetRobot) {
      targetRobot.damage++;
      return;
    }

    x += dx;
    y += dy;
  }
}

function fireBoardLaser(x: number, y: number, direction: Direction, count: number, room: Room): void {
  const dx = direction === Direction.EAST ? 1 : direction === Direction.WEST ? -1 : 0;
  const dy = direction === Direction.SOUTH ? 1 : direction === Direction.NORTH ? -1 : 0;

  let cx = x + dx;
  let cy = y + dy;

  while (cx >= 0 && cx < room.mapSize && cy >= 0 && cy < room.mapSize) {
    const row = room.board[cy];
    if (!row) return;
    const cell = row[cx];
    if (!cell) return;
    if (cell.type === CellType.WALL) return;

    const targetRobot = findRobotAt(room, cx, cy);
    if (targetRobot) {
      targetRobot.damage += count;
      return;
    }

    cx += dx;
    cy += dy;
  }
}

function checkCheckpoints(room: Room): void {
  const flagTypes = [
    CellType.FLAG_1,
    CellType.FLAG_2,
    CellType.FLAG_3,
    CellType.FLAG_4,
    CellType.FLAG_5,
  ];

  for (const player of room.players.values()) {
    const robot = player.robot;
    if (!robot || robot.destroyed) continue;

    const row = room.board[robot.y];
    if (!row) continue;
    const cell = row[robot.x];
    if (!cell) continue;
    const flagIndex = flagTypes.indexOf(cell.type);

    if (flagIndex !== -1) {
      const flagNumber = flagIndex + 1;
      const lastFlag = robot.flagsTouched.length > 0 ? robot.flagsTouched[robot.flagsTouched.length - 1]! : 0;

      if (flagNumber === lastFlag + 1 && !robot.flagsTouched.includes(flagNumber)) {
        robot.flagsTouched.push(flagNumber);
        robot.archiveX = robot.x;
        robot.archiveY = robot.y;
        robot.archiveDirection = robot.direction;

        if (robot.flagsTouched.length === 5) {
          room.gameState.winner = player.id;
          room.gameState.phase = GamePhase.ENDED;
        }
      }
    }
  }
}

function cleanupPhase(room: Room): void {
  for (const player of room.players.values()) {
    const robot = player.robot;
    if (!robot || robot.destroyed) continue;

    if (robot.powerDown) {
      robot.damage = 0;
      if (robot.equipment.length > 0) {
        robot.equipment.pop();
      }
    }

    if (robot.damage >= 10) {
      robot.lives--;
      robot.damage = 2;
      robot.destroyed = true;

      if (robot.lives > 0) {
        setTimeout(() => {
          robot.x = robot.archiveX;
          robot.y = robot.archiveY;
          robot.direction = robot.archiveDirection;
          robot.destroyed = false;
        }, 1000);
      }
    }

    robot.lockedRegisters = [false, false, false, false, false];
    for (let i = 0; i < 5; i++) {
      if (robot.damage >= 5 + i) {
        robot.lockedRegisters[4 - i] = true;
      }
    }

    if (robot.equipment.length > 0 && robot.damage > 0) {
      robot.equipment.pop();
      robot.damage--;
    }
  }
}

export function nextTurn(room: Room): void {
  room.gameState.turnNumber++;
  room.gameState.currentRegister = 0;
  room.gameState.currentPhaseStep = null;
  room.gameState.phase = GamePhase.PROGRAMMING;

  for (const player of room.players.values()) {
    player.isReady = false;
    player.registers = [null, null, null, null, null];

    if (player.robot && !player.robot.destroyed) {
      player.robot.powerDown = false;
    }
  }
}

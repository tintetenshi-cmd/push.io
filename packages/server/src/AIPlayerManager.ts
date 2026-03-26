import { v4 as uuidv4 } from 'uuid';
import {
  Player,
  Room,
  Difficulty,
  Card,
  CardType,
  Direction,
  Position,
  CellType,
} from '@roborally/shared';

export class AIPlayerManager {
  private aiNames = [
    'Bot_Alpha', 'Bot_Beta', 'Bot_Gamma', 'Bot_Delta', 'Bot_Epsilon',
    'Bot_Zeta', 'Bot_Eta', 'Bot_Theta', 'Bot_Iota', 'Bot_Kappa',
  ];

  private usedNames = new Set<string>();

  generateAIName(): string {
    const available = this.aiNames.filter(name => !this.usedNames.has(name));
    if (available.length === 0) {
      return `Bot_${uuidv4().slice(0, 8)}`;
    }
    const name = available[Math.floor(Math.random() * available.length)]!;
    this.usedNames.add(name);
    return name;
  }

  releaseAIName(name: string): void {
    this.usedNames.delete(name);
  }

  createAIPlayer(
    socketId: string,
    name: string,
    avatar: string,
    color: string,
    difficulty: Difficulty,
    isHost: boolean,
    spawnPos: Position | null
  ): Player {
    const player: Player = {
      id: uuidv4(),
      socketId,
      name,
      avatar,
      color,
      isHost,
      isReady: true,
      isAI: true,
      difficulty,
      robot: null,
      hand: [],
      registers: [null, null, null, null, null],
      lastActivity: Date.now(),
    };

    if (spawnPos) {
      player.robot = {
        id: uuidv4(),
        playerId: socketId,
        x: spawnPos.x,
        y: spawnPos.y,
        direction: Direction.EAST,
        lives: 3,
        damage: 0,
        powerDown: false,
        flagsTouched: [],
        lockedRegisters: [false, false, false, false, false],
        equipment: [],
        archiveX: spawnPos.x,
        archiveY: spawnPos.y,
        archiveDirection: Direction.EAST,
        destroyed: false,
      };
    }

    return player;
  }

  // AI decision making for programming phase
  chooseCards(player: Player, room: Room): (Card | null)[] {
    if (!player.robot || player.hand.length === 0) {
      return [null, null, null, null, null];
    }

    const difficulty = player.difficulty || Difficulty.MEDIUM;
    const availableCards = [...player.hand];
    const registers: (Card | null)[] = [null, null, null, null, null];
    const lockedCount = player.robot.lockedRegisters.filter(Boolean).length;
    const filledRegisters = 5 - lockedCount;

    // Fill non-locked registers
    let registersFilled = 0;
    for (let i = 0; i < 5 && registersFilled < filledRegisters; i++) {
      if (!player.robot.lockedRegisters[i] && availableCards.length > 0) {
        const cardIndex = this.selectCardIndex(availableCards, difficulty, room, player.robot, i);
        registers[i] = availableCards[cardIndex];
        availableCards.splice(cardIndex, 1);
        registersFilled++;
      }
    }

    return registers;
  }

  private selectCardIndex(
    cards: Card[],
    difficulty: Difficulty,
    room: Room,
    robot: NonNullable<Player['robot']>,
    registerIndex: number
  ): number {
    switch (difficulty) {
      case Difficulty.EASY:
        return this.selectEasyCard(cards);
      case Difficulty.HARD:
        return this.selectHardCard(cards, room, robot, registerIndex);
      case Difficulty.MEDIUM:
      default:
        return this.selectMediumCard(cards, room, robot);
    }
  }

  private selectEasyCard(cards: Card[]): number {
    // Easy: mostly random, slight preference for forward moves
    const weighted = cards.map((card, index) => ({
      index,
      weight: this.getEasyWeight(card.type),
    }));
    return this.weightedRandom(weighted);
  }

  private getEasyWeight(type: CardType): number {
    switch (type) {
      case CardType.FORWARD_1:
      case CardType.FORWARD_2:
        return 3;
      case CardType.FORWARD_3:
        return 2;
      case CardType.ROTATE_LEFT:
      case CardType.ROTATE_RIGHT:
        return 1;
      default:
        return 1;
    }
  }

  private selectMediumCard(cards: Card[], room: Room, robot: NonNullable<Player['robot']>): number {
    // Medium: prefer forward movement, avoid rotation if near edges
    const weighted = cards.map((card, index) => ({
      index,
      weight: this.getMediumWeight(card.type, room, robot),
    }));
    return this.weightedRandom(weighted);
  }

  private getMediumWeight(type: CardType, room: Room, robot: NonNullable<Player['robot']>): number {
    const nearEdge = robot.x <= 1 || robot.x >= room.mapSize - 2 ||
                     robot.y <= 1 || robot.y >= room.mapSize - 2;

    switch (type) {
      case CardType.FORWARD_1:
        return 5;
      case CardType.FORWARD_2:
        return 4;
      case CardType.FORWARD_3:
        return nearEdge ? 2 : 4;
      case CardType.BACKUP_1:
        return nearEdge ? 1 : 3;
      case CardType.ROTATE_LEFT:
      case CardType.ROTATE_RIGHT:
        return nearEdge ? 4 : 2;
      case CardType.U_TURN:
        return 1;
      default:
        return 2;
    }
  }

  private selectHardCard(
    cards: Card[],
    room: Room,
    robot: NonNullable<Player['robot']>,
    registerIndex: number
  ): number {
    // Hard: strategic play, try to move toward center, avoid pits/walls
    let bestIndex = 0;
    let bestScore = -Infinity;

    for (let i = 0; i < cards.length; i++) {
      const score = this.evaluateCard(cards[i], room, robot, registerIndex);
      if (score > bestScore) {
        bestScore = score;
        bestIndex = i;
      }
    }

    return bestIndex;
  }

  private evaluateCard(
    card: Card,
    room: Room,
    robot: NonNullable<Player['robot']>,
    registerIndex: number
  ): number {
    let score = card.priority; // Higher priority is better
    const centerX = Math.floor(room.mapSize / 2);
    const centerY = Math.floor(room.mapSize / 2);

    // Simulate move
    let newX = robot.x;
    let newY = robot.y;
    let newDir = robot.direction;

    switch (card.type) {
      case CardType.FORWARD_1:
        ({ x: newX, y: newY } = this.simulateMove(robot.x, robot.y, robot.direction, 1));
        break;
      case CardType.FORWARD_2:
        ({ x: newX, y: newY } = this.simulateMove(robot.x, robot.y, robot.direction, 2));
        break;
      case CardType.FORWARD_3:
        ({ x: newX, y: newY } = this.simulateMove(robot.x, robot.y, robot.direction, 3));
        break;
      case CardType.BACKUP_1:
        ({ x: newX, y: newY } = this.simulateMove(robot.x, robot.y, robot.direction, -1));
        break;
      case CardType.ROTATE_LEFT:
        newDir = (robot.direction - 90 + 360) % 360;
        break;
      case CardType.ROTATE_RIGHT:
        newDir = (robot.direction + 90) % 360;
        break;
      case CardType.U_TURN:
        newDir = (robot.direction + 180) % 360;
        break;
    }

    // Check for hazards
    if (newX < 0 || newX >= room.mapSize || newY < 0 || newY >= room.mapSize) {
      score -= 100; // Don't fall off
    } else {
      const cell = room.board[newY]?.[newX];
      if (cell?.type === CellType.PIT) {
        score -= 50; // Avoid pits
      }
      if (cell?.type === CellType.WALL) {
        score -= 30; // Avoid walls
      }
    }

    // Prefer moving toward center
    const oldDistToCenter = Math.abs(robot.x - centerX) + Math.abs(robot.y - centerY);
    const newDistToCenter = Math.abs(newX - centerX) + Math.abs(newY - centerY);
    if (newDistToCenter < oldDistToCenter) {
      score += 20;
    } else if (newDistToCenter > oldDistToCenter) {
      score -= 5;
    }

    // Prefer forward movement in early registers
    if (registerIndex < 3) {
      if (card.type === CardType.FORWARD_1 ||
          card.type === CardType.FORWARD_2 ||
          card.type === CardType.FORWARD_3) {
        score += 10;
      }
    }

    return score;
  }

  private simulateMove(x: number, y: number, direction: Direction, steps: number): Position {
    let newX = x;
    let newY = y;

    const dx = direction === Direction.EAST ? 1 : direction === Direction.WEST ? -1 : 0;
    const dy = direction === Direction.SOUTH ? 1 : direction === Direction.NORTH ? -1 : 0;

    const absSteps = Math.abs(steps);
    const stepX = steps > 0 ? dx : -dx;
    const stepY = steps > 0 ? dy : -dy;

    for (let i = 0; i < absSteps; i++) {
      newX += stepX;
      newY += stepY;
    }

    return { x: newX, y: newY };
  }

  private weightedRandom(weighted: { index: number; weight: number }[]): number {
    const totalWeight = weighted.reduce((sum, w) => sum + w.weight, 0);
    let random = Math.random() * totalWeight;

    for (const { index, weight } of weighted) {
      random -= weight;
      if (random <= 0) {
        return index;
      }
    }

    return weighted[weighted.length - 1]?.index ?? 0;
  }
}

export const aiPlayerManager = new AIPlayerManager();

import type { Organ, Question, Article } from './types.js';
import { ORGANS } from './wheel.js';

export interface BoardConfig {
  size: number;
  cols: number;
  ladders: Record<number, number>;
  snakes: Record<number, number>;
}

export const SNAKES_BOARD: BoardConfig = {
  size: 30,
  cols: 6,
  ladders: { 3: 11, 8: 16, 14: 25, 19: 28 },
  snakes: { 29: 9, 22: 12, 17: 4, 26: 15 },
};

export interface SnakesPlayer {
  id: string;
  name: string;
  pos: number; // 0 is start, 1..30
  color: string;
}

export type TileEventType = 'none' | 'ladder' | 'snake' | 'win';

export interface TileEvent {
  type: TileEventType;
  from: number;
  to?: number;
  message?: string;
}

export function getTileOrgan(squareNumber: number): Organ {
  // Repeating pattern of the 3 organ colours
  return ORGANS[(squareNumber - 1) % 3];
}

/**
 * Checks if a move is valid given the current position and dice roll.
 * Requires exact roll to reach square 30 (size).
 */
export function canMove(currentPos: number, roll: number, boardSize = 30): boolean {
  return currentPos + roll <= boardSize;
}

/**
 * Evaluates special tile events when landing on a square.
 */
export function checkTileEvent(square: number, board = SNAKES_BOARD): TileEvent {
  if (square === board.size) {
    return { type: 'win', from: square, to: square, message: 'Reached HOME!' };
  }
  if (board.ladders[square]) {
    return {
      type: 'ladder',
      from: square,
      to: board.ladders[square],
      message: `Ladder found! Answer correctly to climb ${square} ➔ ${board.ladders[square]}.`,
    };
  }
  if (board.snakes[square]) {
    return {
      type: 'snake',
      from: square,
      to: board.snakes[square],
      message: `Snake ahead! Answer correctly to escape sliding down to ${board.snakes[square]}.`,
    };
  }
  return { type: 'none', from: square };
}

/**
 * Applies the result of answering a question when landing on a ladder or snake.
 */
export function resolveSpecialTile(
  square: number,
  isCorrect: boolean,
  board = SNAKES_BOARD
): { finalPos: number; message: string } {
  if (board.ladders[square]) {
    const destination = board.ladders[square];
    if (isCorrect) {
      return {
        finalPos: destination,
        message: `Correct! Climbed the ladder from ${square} to ${destination}!`,
      };
    } else {
      return {
        finalPos: square,
        message: `Incorrect! Missed the ladder and stays on square ${square}.`,
      };
    }
  }

  if (board.snakes[square]) {
    const destination = board.snakes[square];
    if (isCorrect) {
      return {
        finalPos: square,
        message: `Correct! Defended against the snake and stays safely on square ${square}!`,
      };
    } else {
      return {
        finalPos: destination,
        message: `Incorrect! Slid down the snake from ${square} to ${destination}.`,
      };
    }
  }

  return { finalPos: square, message: `Moved to square ${square}.` };
}

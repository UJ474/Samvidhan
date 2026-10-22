import { describe, it, expect } from 'vitest';
import { canMove, checkTileEvent, resolveSpecialTile, getTileOrgan, SNAKES_BOARD } from '../src/snakes.js';

describe('Snakes & Ladders Game Engine', () => {
  it('correctly validates movement and exact roll requirement', () => {
    expect(canMove(0, 5)).toBe(true);
    expect(canMove(25, 5)).toBe(true);
    expect(canMove(26, 5)).toBe(false); // 31 > 30, invalid
    expect(canMove(29, 1)).toBe(true); // 30, exact
  });

  it('detects ladder and snake squares correctly', () => {
    // Ladders: { 3: 11, 8: 16, 14: 25, 19: 28 }
    const ladderEvent = checkTileEvent(3);
    expect(ladderEvent.type).toBe('ladder');
    expect(ladderEvent.to).toBe(11);

    // Snakes: { 29: 9, 22: 12, 17: 4, 26: 15 }
    const snakeEvent = checkTileEvent(22);
    expect(snakeEvent.type).toBe('snake');
    expect(snakeEvent.to).toBe(12);

    // Normal square
    const normalEvent = checkTileEvent(5);
    expect(normalEvent.type).toBe('none');

    // Win square 30
    const winEvent = checkTileEvent(30);
    expect(winEvent.type).toBe('win');
  });

  it('climbs ladder on correct answer and stays on wrong answer', () => {
    const climbed = resolveSpecialTile(8, true);
    expect(climbed.finalPos).toBe(16);

    const stayed = resolveSpecialTile(8, false);
    expect(stayed.finalPos).toBe(8);
  });

  it('escapes snake on correct answer and slides on wrong answer', () => {
    const escaped = resolveSpecialTile(17, true);
    expect(escaped.finalPos).toBe(17);

    const slid = resolveSpecialTile(17, false);
    expect(slid.finalPos).toBe(4);
  });

  it('repeats organ pattern across the board', () => {
    expect(getTileOrgan(1)).toBe('Legislature');
    expect(getTileOrgan(2)).toBe('Executive');
    expect(getTileOrgan(3)).toBe('Judiciary');
    expect(getTileOrgan(4)).toBe('Legislature');
  });
});

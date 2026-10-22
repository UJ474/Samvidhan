import { describe, it, expect } from 'vitest';
import { planSpin, sliceUnderPointer, organForSlice, ORGANS, mulberry32 } from '../src/wheel.js';
import type { Organ } from '../src/types.js';

describe('Wheel Mathematics & PRNG', () => {
  it('mulberry32 generates deterministic sequences from a seed', () => {
    const rng1 = mulberry32(12345);
    const rng2 = mulberry32(12345);
    const values1 = [rng1(), rng1(), rng1()];
    const values2 = [rng2(), rng2(), rng2()];
    expect(values1).toEqual(values2);
  });

  it('accurately resolves the intended winner for 10,000 seeds across all organs', () => {
    const testCount = 10000;
    const organs: Organ[] = ['Legislature', 'Executive', 'Judiciary'];

    for (let i = 0; i < testCount; i++) {
      const winner = organs[i % 3];
      const seed = i * 7919 + 42;
      const plan = planSpin(winner, seed);

      const resolvedSlice = sliceUnderPointer(plan.finalRotation);
      const landedOrgan = organForSlice(resolvedSlice);

      expect(landedOrgan).toBe(winner);
      expect(plan.slice).toBe(resolvedSlice);
      expect(plan.durationMs).toBeGreaterThanOrEqual(4800);
      expect(plan.durationMs).toBeLessThanOrEqual(5600);
    }
  });

  it('sliceUnderPointer correctly computes bounds', () => {
    // 0 deg rotation -> slice 0 is under pointer
    expect(sliceUnderPointer(0)).toBe(0);
    // At 60 deg clockwise rotation, slice 5 moves under pointer
    expect(sliceUnderPointer(60)).toBe(5);
  });
});

import type { Organ } from './types.js';

export const SLICES = 6;
export const ORGANS: Organ[] = ['Legislature', 'Executive', 'Judiciary'];

/**
 * 32-bit deterministic seeded pseudo-random number generator (Mulberry32).
 */
export function mulberry32(seed: number): () => number {
  let s = Math.floor(seed);
  return function (): number {
    let t = (s += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface SpinPlan {
  slice: number;
  finalRotation: number;
  durationMs: number;
}

/**
 * Plans a deterministic spin trajectory landing on the specified winning Organ.
 */
export function planSpin(winner: Organ, seed: number): SpinPlan {
  const rng = mulberry32(seed);
  const options = [0, 1, 2, 3, 4, 5].filter((i) => ORGANS[i % 3] === winner);
  const slice = options[Math.floor(rng() * options.length)];
  const size = 360 / SLICES;
  const jitter = (rng() - 0.5) * size * 0.7; // stays inside the slice, never within 15% of a divider
  const turns = 5 + Math.floor(rng() * 3);
  const center = slice * size + size / 2; // clockwise from the top
  return {
    slice,
    finalRotation: turns * 360 + (360 - center) + jitter,
    durationMs: 4800 + Math.floor(rng() * 800),
  };
}

/**
 * Returns which slice index (0..5) is currently under the top pointer (at 12 o'clock).
 */
export function sliceUnderPointer(rotation: number): number {
  const size = 360 / SLICES;
  const r = ((rotation % 360) + 360) % 360;
  return Math.floor(((360 - r) % 360) / size);
}

/**
 * Returns the Organ corresponding to a slice index.
 */
export function organForSlice(sliceIndex: number): Organ {
  return ORGANS[sliceIndex % 3];
}

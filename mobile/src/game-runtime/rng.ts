/**
 * Deterministic pseudo-random numbers for level generation.
 * Game code must use this instead of `Math.random` so that the same
 * (game id, generator version, seed) always yields the same level (FR-021).
 */

export interface Rng {
  /** Float in [0, 1). */
  next(): number;
  /** Integer in [min, max], both inclusive. */
  int(min: number, max: number): number;
  /** True with probability `p`. */
  chance(p: number): boolean;
  pick<T>(items: readonly T[]): T;
  /** Returns a new shuffled array; the input is not modified. */
  shuffle<T>(items: readonly T[]): T[];
}

/** FNV-1a, 32-bit. */
function fnv1a(text: string, offset: number): number {
  let h = offset >>> 0;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Stable 16-hex-character hash for level and solution fingerprints. Not cryptographic. */
export function fingerprint(text: string): string {
  const a = fnv1a(text, 0x811c9dc5);
  const b = fnv1a(text, 0x9747b28c);
  return a.toString(16).padStart(8, '0') + b.toString(16).padStart(8, '0');
}

/** Combines the inputs that must all match for two levels to be identical. */
export function levelSeedKey(gameId: string, generatorVersion: string, seed: string): string {
  return `${gameId}@${generatorVersion}#${seed}`;
}

export function createRng(seed: string): Rng {
  // mulberry32 seeded from a string hash.
  let a = fnv1a(seed, 0x811c9dc5);
  const next = (): number => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (min: number, max: number): number => {
    if (!Number.isInteger(min) || !Number.isInteger(max) || max < min) {
      throw new Error(`Invalid integer range: [${min}, ${max}]`);
    }
    return min + Math.floor(next() * (max - min + 1));
  };
  return {
    next,
    int,
    chance: (p) => next() < p,
    pick: <T>(items: readonly T[]): T => {
      if (items.length === 0) throw new Error('Cannot pick from an empty list');
      return items[int(0, items.length - 1)] as T;
    },
    shuffle: <T>(items: readonly T[]): T[] => {
      const out = [...items];
      for (let i = out.length - 1; i > 0; i -= 1) {
        const j = int(0, i);
        const tmp = out[i] as T;
        out[i] = out[j] as T;
        out[j] = tmp;
      }
      return out;
    },
  };
}

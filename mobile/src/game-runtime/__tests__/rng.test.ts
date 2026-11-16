import { createRng, fingerprint, levelSeedKey } from '../rng';

describe('createRng', () => {
  it('yields the same sequence for the same seed', () => {
    const a = createRng('seed-1');
    const b = createRng('seed-1');
    const seqA = Array.from({ length: 50 }, () => a.next());
    const seqB = Array.from({ length: 50 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('yields different sequences for different seeds', () => {
    const a = createRng('seed-1');
    const b = createRng('seed-2');
    expect(Array.from({ length: 10 }, () => a.next())).not.toEqual(
      Array.from({ length: 10 }, () => b.next()),
    );
  });

  it('matches a pinned regression sequence', () => {
    // Guards against accidental algorithm changes, which would change every generated level.
    const rng = createRng('brainarena');
    expect(Array.from({ length: 5 }, () => rng.int(0, 999))).toMatchInlineSnapshot(`
[
  880,
  306,
  350,
  306,
  392,
]
`);
  });

  it('keeps floats in [0, 1) and integers within inclusive bounds', () => {
    const rng = createRng('bounds');
    const seen = new Set<number>();
    for (let i = 0; i < 2000; i += 1) {
      const f = rng.next();
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThan(1);
      const n = rng.int(3, 6);
      expect(Number.isInteger(n)).toBe(true);
      seen.add(n);
    }
    expect([...seen].sort()).toEqual([3, 4, 5, 6]);
  });

  it('is roughly uniform', () => {
    const rng = createRng('uniform');
    const counts = [0, 0, 0, 0];
    for (let i = 0; i < 8000; i += 1) counts[rng.int(0, 3)]! += 1;
    for (const c of counts) expect(Math.abs(c - 2000)).toBeLessThan(200);
  });

  it('rejects invalid ranges and empty picks', () => {
    const rng = createRng('x');
    expect(() => rng.int(5, 4)).toThrow('Invalid integer range');
    expect(() => rng.int(0.5, 2)).toThrow('Invalid integer range');
    expect(() => rng.pick([])).toThrow('empty');
  });

  it('shuffles into a permutation without mutating the input', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    const copy = [...input];
    const out = createRng('shuffle').shuffle(input);
    expect(input).toEqual(copy);
    expect([...out].sort((a, b) => a - b)).toEqual(copy);
    expect(createRng('shuffle').shuffle(input)).toEqual(out);
  });

  it('chance respects its extremes', () => {
    const rng = createRng('chance');
    for (let i = 0; i < 100; i += 1) {
      expect(rng.chance(0)).toBe(false);
      expect(rng.chance(1)).toBe(true);
    }
  });
});

describe('fingerprint', () => {
  it('is stable, 16 hex characters and input-sensitive', () => {
    expect(fingerprint('abc')).toBe(fingerprint('abc'));
    expect(fingerprint('abc')).toMatch(/^[0-9a-f]{16}$/);
    expect(fingerprint('abc')).not.toBe(fingerprint('abd'));
  });

  it('has no collisions across 5,000 short keys', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 5000; i += 1) seen.add(fingerprint(`level-${i}`));
    expect(seen.size).toBe(5000);
  });
});

describe('levelSeedKey', () => {
  it('separates game, version and seed', () => {
    expect(levelSeedKey('W3-G01', '1.0.0', '42')).toBe('W3-G01@1.0.0#42');
    expect(levelSeedKey('W3-G01', '1.0.0', '42')).not.toBe(levelSeedKey('W3-G01', '1.0.1', '42'));
  });
});

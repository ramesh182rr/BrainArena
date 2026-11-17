import { DIFFICULTY_BANDS, type DifficultyBand } from '@/game-runtime/contracts';

import { MAZE_PROFILES } from '../generator';
import { numberMaze } from '../module';
import { solveMaze } from '../solver';

const REGRESSION_SEEDS = Array.from({ length: 60 }, (_, i) => `regression-${i}`);

describe.each(DIFFICULTY_BANDS)('maze generator — %s', (band: DifficultyBand) => {
  const profile = MAZE_PROFILES[band];

  it('produces valid levels for every regression seed', () => {
    for (const seed of REGRESSION_SEEDS) {
      const level = numberMaze.createLevel(seed, band);
      expect({ seed, valid: numberMaze.validateLevel(level).valid }).toEqual({ seed, valid: true });
      expect(level.source).toBe('generated');
    }
  });

  it('respects the band profile', () => {
    for (const seed of REGRESSION_SEEDS) {
      const s = numberMaze.createLevel(seed, band).initialState;
      expect([s.width, s.height]).toEqual([profile.width, profile.height]);
      expect([s.min, s.max]).toEqual([profile.min, profile.max]);
      expect(s.par).toBeGreaterThanOrEqual(profile.minPar);
      const r = solveMaze(s, s.path, s.startValue, { solutionCap: profile.maxSolutions + 1 });
      expect(r.status === 'solved' && r.solutions).toBeLessThanOrEqual(profile.maxSolutions);
      const ops = new Set(s.cells.flatMap((c) => (c.t === 'gate' ? [c.op] : [])));
      for (const op of ops) expect(profile.ops).toContain(op);
      expect(s.cells.filter((c) => c.t === 'lock').length).toBe(profile.locks);
      expect(s.cells.filter((c) => c.t === 'block').length).toBe(profile.blocks);
      expect(s.target).not.toBe(s.startValue);
    }
  });

  it('is deterministic and varied', () => {
    expect(numberMaze.createLevel('determinism', band)).toEqual(numberMaze.createLevel('determinism', band));
    const prints = new Set(REGRESSION_SEEDS.map((seed) => numberMaze.createLevel(seed, band).fingerprint));
    expect(prints.size).toBe(REGRESSION_SEEDS.length);
  });
});

describe('maze generator properties (1,000 seeds)', () => {
  it('every generated level validates', () => {
    const failures: string[] = [];
    const started = Date.now();
    for (const band of DIFFICULTY_BANDS) {
      for (let i = 0; i < 200; i += 1) {
        const result = numberMaze.validateLevel(numberMaze.createLevel(`property-${i}`, band));
        if (!result.valid) failures.push(`${band}/${i}: ${result.reasonCode}`);
      }
    }
    expect(failures).toEqual([]);
    expect((Date.now() - started) / 1000).toBeLessThan(25);
  });

  it('harder bands need longer routes on average', () => {
    const mean = DIFFICULTY_BANDS.map((band) => {
      const pars = REGRESSION_SEEDS.map((seed) => numberMaze.createLevel(seed, band).initialState.par);
      return pars.reduce((a, b) => a + b, 0) / pars.length;
    });
    for (let i = 1; i < mean.length; i += 1) expect(mean[i]!).toBeGreaterThanOrEqual(mean[i - 1]!);
  });
});

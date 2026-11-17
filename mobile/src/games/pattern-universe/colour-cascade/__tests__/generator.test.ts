import { DIFFICULTY_BANDS, type DifficultyBand } from '@/game-runtime/contracts';

import { GARDEN_PROFILES } from '../generator';
import { colourCascade } from '../module';
import { inBloom } from '../rules';

const REGRESSION_SEEDS = Array.from({ length: 60 }, (_, i) => `regression-${i}`);
jest.setTimeout(90_000);

describe.each(DIFFICULTY_BANDS)('garden generator — %s', (band: DifficultyBand) => {
  const profile = GARDEN_PROFILES[band];

  it('produces valid gardens for every regression seed, within the band', () => {
    for (const seed of REGRESSION_SEEDS) {
      const level = colourCascade.createLevel(seed, band);
      expect({ seed, valid: colourCascade.validateLevel(level).valid }).toEqual({ seed, valid: true });
      const s = level.initialState;
      expect([s.width, s.height, s.cycle.length]).toEqual([profile.width, profile.height, profile.colours]);
      expect(s.cells.filter((c) => c.t === 'stone')).toHaveLength(profile.stones);
      expect(s.cells.filter((c) => c.t === 'plant' && c.hardy)).toHaveLength(profile.hardy);
      expect(s.par).toBeGreaterThanOrEqual(Math.min(profile.minPar, 1));
      expect(s.par).toBeLessThanOrEqual(profile.maxPar + profile.spare);
      expect(inBloom(s.cells)).toBe(false);
    }
  });

  it('is deterministic and varied', () => {
    expect(colourCascade.createLevel('determinism', band)).toEqual(colourCascade.createLevel('determinism', band));
    const prints = new Set(REGRESSION_SEEDS.map((seed) => colourCascade.createLevel(seed, band).fingerprint));
    expect(prints.size).toBe(REGRESSION_SEEDS.length);
  });
});

describe('garden generator properties (1,000 seeds)', () => {
  it('every generated garden validates', () => {
    const failures: string[] = [];
    for (const band of DIFFICULTY_BANDS) {
      for (let i = 0; i < 200; i += 1) {
        const r = colourCascade.validateLevel(colourCascade.createLevel(`property-${i}`, band));
        if (!r.valid) failures.push(`${band}/${i}: ${r.reasonCode}`);
      }
    }
    expect(failures).toEqual([]);
  });
});

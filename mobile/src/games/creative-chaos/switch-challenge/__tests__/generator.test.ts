import { DIFFICULTY_BANDS, type DifficultyBand } from '@/game-runtime/contracts';

import { MACHINE_PROFILES } from '../generator';
import { switchChallenge } from '../module';

const SEEDS = Array.from({ length: 60 }, (_, i) => `regression-${i}`);

describe.each(DIFFICULTY_BANDS)('machine generator — %s', (band: DifficultyBand) => {
  const p = MACHINE_PROFILES[band];

  it('produces valid machines within the band profile', () => {
    for (const seed of SEEDS) {
      const level = switchChallenge.createLevel(seed, band);
      expect({ seed, valid: switchChallenge.validateLevel(level).valid }).toEqual({ seed, valid: true });
      const s = level.initialState;
      expect([s.start.length, s.levels, s.switches.length]).toEqual([p.dials, p.levels, p.switches]);
      expect(s.switches.filter((sw) => sw.condition)).toHaveLength(p.conditional);
      expect(s.par).toBeGreaterThanOrEqual(p.par[0]);
      expect(s.par).toBeLessThanOrEqual(p.par[1]);
      expect(s.budget).toBe(s.par + p.slack);
      if (!p.lowering) expect(s.switches.every((sw) => sw.effects.every((e) => e.delta === 1))).toBe(true);
      expect(new Set(s.switches.flatMap((sw) => sw.effects.map((e) => e.dial))).size).toBe(p.dials);
    }
  });

  it('is deterministic and varied', () => {
    expect(switchChallenge.createLevel('determinism', band)).toEqual(switchChallenge.createLevel('determinism', band));
    expect(new Set(SEEDS.map((seed) => switchChallenge.createLevel(seed, band).fingerprint)).size).toBe(SEEDS.length);
  });
});

describe('machine generator properties (1,000 seeds)', () => {
  it('every generated machine validates', () => {
    const failures: string[] = [];
    for (const band of DIFFICULTY_BANDS) {
      for (let i = 0; i < 200; i += 1) {
        const r = switchChallenge.validateLevel(switchChallenge.createLevel(`property-${i}`, band));
        if (!r.valid) failures.push(`${band}/${i}: ${r.reasonCode}`);
      }
    }
    expect(failures).toEqual([]);
  });

  it('harder bands need more presses on average', () => {
    const mean = DIFFICULTY_BANDS.map((b) => SEEDS.reduce((sum, seed) => sum + switchChallenge.createLevel(seed, b).initialState.par, 0) / SEEDS.length);
    for (let i = 1; i < mean.length; i += 1) expect(mean[i]!).toBeGreaterThanOrEqual(mean[i - 1]!);
  });
});

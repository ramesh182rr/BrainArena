import { DIFFICULTY_BANDS, type DifficultyBand } from '@/game-runtime/contracts';

import { LAB_PROFILES, minimumTests } from '../generator';
import { ruleBreaker } from '../module';
import { consistentRules, determines, hiddenRuleKinds, observe, passes, ruleSpace } from '../rules';

const REGRESSION_SEEDS = Array.from({ length: 60 }, (_, i) => `regression-${i}`);

describe.each(DIFFICULTY_BANDS)('lab generator — %s', (band: DifficultyBand) => {
  const profile = LAB_PROFILES[band];

  it('produces valid labs for every regression seed', () => {
    for (const seed of REGRESSION_SEEDS) {
      expect({ seed, valid: ruleBreaker.validateLevel(ruleBreaker.createLevel(seed, band)).valid }).toEqual({ seed, valid: true });
    }
  });

  it('respects the band: rule form, tray size, par, balanced exams forced by the tray', () => {
    for (const seed of REGRESSION_SEEDS.slice(0, 30)) {
      const s = ruleBreaker.createLevel(seed, band).initialState;
      expect(hiddenRuleKinds(band)).toContain(s.rule.k);
      expect(s.tray).toHaveLength(profile.trayCount);
      expect(s.par).toBeGreaterThanOrEqual(profile.minPar);
      const pass = s.tray.filter((x) => passes(s.rule, x)).length;
      expect(pass).toBeGreaterThanOrEqual(2);
      expect(s.tray.length - pass).toBeGreaterThanOrEqual(2);
      const all = consistentRules(ruleSpace(band), s.tray.map((x) => observe(s.rule, x)));
      for (const exam of s.exams) expect(determines(all, exam)).toBe(true);
    }
  });

  it('is deterministic and varied', () => {
    expect(ruleBreaker.createLevel('determinism', band)).toEqual(ruleBreaker.createLevel('determinism', band));
    const prints = new Set(REGRESSION_SEEDS.map((seed) => ruleBreaker.createLevel(seed, band).fingerprint));
    expect(prints.size).toBe(REGRESSION_SEEDS.length);
  });
});

describe('lab generator properties (1,000 seeds)', () => {
  it('every generated lab validates', () => {
    const failures: string[] = [];
    for (const band of DIFFICULTY_BANDS) {
      for (let i = 0; i < 200; i += 1) {
        const result = ruleBreaker.validateLevel(ruleBreaker.createLevel(`property-${i}`, band));
        if (!result.valid) failures.push(`${band}/${i}: ${result.reasonCode}`);
      }
    }
    expect(failures).toEqual([]);
  });

  it('par really is the minimum number of tests', () => {
    // Brute-force check on intro labs: no smaller subset forces the exam, and one of size par does.
    for (let i = 0; i < 15; i += 1) {
      const s = ruleBreaker.createLevel(`minimum-${i}`, 'intro').initialState;
      expect(minimumTests(ruleSpace('intro'), s.rule, s.tray, s.exams[0]!)).toBe(s.par);
      const subsets = (k: number): number[][] => {
        const out: number[][] = [];
        const go = (start: number, acc: number[]) => {
          if (acc.length === k) return void out.push(acc);
          for (let j = start; j < s.tray.length; j += 1) go(j + 1, [...acc, j]);
        };
        go(0, []);
        return out;
      };
      const forced = (idx: number[]) =>
        determines(consistentRules(ruleSpace('intro'), idx.map((j) => observe(s.rule, s.tray[j]!))), s.exams[0]!);
      expect(subsets(s.par).some(forced)).toBe(true);
      if (s.par > 0) expect(subsets(s.par - 1).some(forced)).toBe(false);
    }
  });
});

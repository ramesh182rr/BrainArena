import { DIFFICULTY_BANDS, type DifficultyBand } from '@/game-runtime/contracts';

import { generateBoard, PROFILES } from '../generator';
import { isRotatable } from '../grid';
import { voltCourier } from '../module';
import { simulate } from '../simulate';
import type { VoltCourierState } from '../types';

/**
 * Fixed regression seeds: 60 per band (300 total), well above the GDD's
 * minimum of 50. A change that makes any of these fail is a regression.
 */
const REGRESSION_SEEDS = Array.from({ length: 60 }, (_, i) => `regression-${i}`);

function stats(state: VoltCourierState) {
  const count = (t: string) => state.cells.filter((c) => c.t === t).length;
  return {
    emitters: count('emitter'),
    receivers: count('receiver'),
    gates: count('gate'),
    crosses: count('cross'),
    kinds: new Set(state.cells.flatMap((c) => (c.t === 'emitter' ? [c.kind] : []))).size,
  };
}

describe.each(DIFFICULTY_BANDS)('generator — %s', (band: DifficultyBand) => {
  const profile = PROFILES[band];

  it('produces valid, unsolved, solvable levels for every regression seed', () => {
    for (const seed of REGRESSION_SEEDS) {
      const level = voltCourier.createLevel(seed, band);
      const result = voltCourier.validateLevel(level);
      expect({ seed, ...result, solutionFingerprint: undefined }).toEqual({ seed, valid: true, solutionFingerprint: undefined });
      expect(level.source).toBe('generated');
      expect(level.difficulty).toBe(band);
      expect(level.generatorVersion).toBe(voltCourier.version);
    }
  });

  it('respects the band profile', () => {
    for (const seed of REGRESSION_SEEDS) {
      const state = voltCourier.createLevel(seed, band).initialState;
      const s = stats(state);
      expect(state.width).toBe(profile.width);
      expect(state.height).toBe(profile.height);
      expect(s.emitters).toBeGreaterThanOrEqual(profile.pulses[0]);
      expect(s.emitters).toBeLessThanOrEqual(profile.pulses[1]);
      expect(s.receivers).toBe(s.emitters);
      expect(s.kinds).toBe(Math.min(profile.kinds, s.emitters));
      expect(s.gates).toBe(profile.gates);
      if (!profile.crossings) expect(s.crosses).toBe(0);
      expect(state.par).toBeGreaterThanOrEqual(profile.minPar);
      expect(state.par).toBeLessThanOrEqual(profile.maxPar);
      expect(state.turns).toBe(0);
      expect(state.history).toEqual([]);
      expect(state.rotations).toEqual(state.initialRotations);
    }
  });

  it('is deterministic for the same seed and differs across seeds', () => {
    const a = voltCourier.createLevel('determinism', band);
    expect(voltCourier.createLevel('determinism', band)).toEqual(a);
    const fingerprints = new Set(REGRESSION_SEEDS.map((seed) => voltCourier.createLevel(seed, band).fingerprint));
    // Small intro boards can occasionally coincide; larger bands should not.
    expect(fingerprints.size).toBeGreaterThanOrEqual(REGRESSION_SEEDS.length - (band === 'intro' ? 3 : 0));
  });

  it('returns a certificate solution that solves the board', () => {
    for (const seed of REGRESSION_SEEDS.slice(0, 20)) {
      const { state, solution } = generateBoard(`cert-${seed}`, profile);
      expect(simulate({ ...state, rotations: solution }).solved).toBe(true);
      expect(simulate(state).solved).toBe(false);
      // Only rotatable cells may differ between the puzzle and its solution.
      state.cells.forEach((cell, i) => {
        if (!isRotatable(cell)) expect(solution[i]).toBe(state.rotations[i]);
      });
    }
  });
});

describe('generator properties (1,000 seeds)', () => {
  it('every generated level validates and its fingerprint matches its structure', () => {
    const failures: string[] = [];
    let total = 0;
    const started = Date.now();
    for (const band of DIFFICULTY_BANDS) {
      for (let i = 0; i < 200; i += 1) {
        const seed = `property-${i}`;
        const level = voltCourier.createLevel(seed, band);
        const result = voltCourier.validateLevel(level);
        if (!result.valid) failures.push(`${band}/${seed}: ${result.reasonCode}`);
        total += 1;
      }
    }
    expect(failures).toEqual([]);
    expect(total).toBe(1000);
    // Generation + validation should stay well under the interaction budget per level.
    expect((Date.now() - started) / total).toBeLessThan(25);
  });

  it('makes harder bands structurally harder on average', () => {
    const meanPar = DIFFICULTY_BANDS.map((band) => {
      const pars = REGRESSION_SEEDS.map((seed) => voltCourier.createLevel(seed, band).initialState.par);
      return pars.reduce((a, b) => a + b, 0) / pars.length;
    });
    for (let i = 1; i < meanPar.length; i += 1) expect(meanPar[i]!).toBeGreaterThan(meanPar[i - 1]!);
  });

  it('keys levels by game, version, seed and difficulty', () => {
    const a = voltCourier.createLevel('same-seed', 'easy');
    const b = voltCourier.createLevel('same-seed', 'standard');
    expect(a.fingerprint).not.toBe(b.fingerprint);
    expect(a.levelId).toBe('W3-G01:easy:same-seed');
  });
});

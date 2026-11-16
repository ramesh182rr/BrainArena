import type { GameModule, PuzzleLevel } from '../contracts';
import type { RuntimeDeps } from '../events';
import { createRng, fingerprint, levelSeedKey } from '../rng';

/** Minimal game for runtime tests: add steps until the counter hits the target. */
export interface CounterState {
  value: number;
  target: number;
  limit: number;
}
export type CounterAction = { type: 'add'; amount: number };

export interface CounterOptions {
  /** Seeds for which createLevel produces an invalid level. */
  brokenSeeds?: readonly string[];
  /** Seeds for which createLevel throws. */
  throwingSeeds?: readonly string[];
  brokenFallback?: boolean;
}

export function makeCounterGame(options: CounterOptions = {}): GameModule<CounterState, CounterAction> {
  const id = 'TEST-COUNTER';
  const version = '1.0.0';
  const build = (seed: string, target: number, difficulty: PuzzleLevel['difficulty']): PuzzleLevel<CounterState> => ({
    gameId: id,
    levelId: `${id}:${seed}`,
    generatorVersion: version,
    seed,
    difficulty,
    source: 'generated',
    fingerprint: fingerprint(`counter:${target}`),
    initialState: { value: 0, target, limit: target + 2 },
    metadata: { target },
  });
  return {
    id,
    version,
    createLevel(seed, difficulty) {
      if (options.throwingSeeds?.includes(seed)) throw new Error('generator crashed');
      if (options.brokenSeeds?.includes(seed)) return build(seed, 0, difficulty);
      const rng = createRng(levelSeedKey(id, version, seed));
      return build(seed, rng.int(2, 5), difficulty);
    },
    fallbackLevel(difficulty) {
      return { ...build('fallback', options.brokenFallback ? 0 : 3, difficulty), source: 'fallback' };
    },
    validateLevel(level) {
      return level.initialState.target > 0
        ? { valid: true, solutionFingerprint: fingerprint(`add:${level.initialState.target}`) }
        : { valid: false, reasonCode: 'target_not_positive' };
    },
    reduce(state, action) {
      if (action.type !== 'add' || !Number.isInteger(action.amount) || action.amount <= 0) return state;
      return { ...state, value: state.value + action.amount };
    },
    isComplete: (state) => state.value === state.target,
    isFailed: (state) => state.value > state.limit,
    score: (_state, { moves, hintsUsed }) => Math.max(0, 100 - moves * 5 - hintsUsed * 10),
    hint: (state, tier) => ({
      tier,
      text: `tier ${tier}: ${state.target - state.value} to go`,
      highlightIds: ['counter'],
    }),
  };
}

/** Deterministic clock and id source: each `now()` call advances by `stepMs`. */
export function makeDeps(stepMs = 1000): RuntimeDeps & { advance(ms: number): void } {
  let t = Date.parse('2026-11-17T10:00:00.000Z');
  let n = 0;
  return {
    now: () => {
      const iso = new Date(t).toISOString();
      t += stepMs;
      return iso;
    },
    newId: () => {
      n += 1;
      return `id-${n}`;
    },
    advance: (ms) => {
      t += ms;
    },
  };
}

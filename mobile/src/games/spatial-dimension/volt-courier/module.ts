import type {
  DifficultyBand,
  GameHint,
  GameModule,
  HintTier,
  PuzzleLevel,
  ScoreContext,
  ValidationResult,
} from '@/game-runtime/contracts';
import { fingerprint, levelSeedKey } from '@/game-runtime/rng';

import { FALLBACK_LEVELS, findAuthoredLevel, parseBoard, type AuthoredLevel } from './authored';
import { generateBoard, PROFILES } from './generator';
import { isRotatable, sameOrientation, turnsBetween } from './grid';
import { simulate } from './simulate';
import { solve } from './solver';
import { PULSE_KIND_INFO, type VoltCourierAction, type VoltCourierState, type Cell } from './types';

export const VOLT_COURIER_ID = 'W3-G01';
/** Bump when the same seed would produce a different board or rules change. */
export const VOLT_COURIER_VERSION = '1.0.0';

/** Undo depth kept in saved state. */
export const MAX_HISTORY = 100;

const BASE_SCORE = 100;
const MAX_EFFICIENCY_BONUS = 50;

export const cellId = (index: number) => `cell-${index}`;

/** Fingerprint of the board structure, independent of the player's rotations (FR-027). */
export function boardFingerprint(state: Pick<VoltCourierState, 'width' | 'height' | 'cells'>): string {
  return fingerprint(JSON.stringify([state.width, state.height, state.cells]));
}

function toLevel(
  state: VoltCourierState,
  seed: string,
  difficulty: DifficultyBand,
  source: PuzzleLevel['source'],
  levelId: string,
): PuzzleLevel<VoltCourierState> {
  const pulses = state.cells.filter((c) => c.t === 'emitter');
  return {
    gameId: VOLT_COURIER_ID,
    levelId,
    generatorVersion: VOLT_COURIER_VERSION,
    seed,
    difficulty,
    source,
    fingerprint: boardFingerprint(state),
    initialState: state,
    metadata: {
      width: state.width,
      height: state.height,
      pulses: pulses.length,
      kinds: new Set(pulses.map((c) => (c.t === 'emitter' ? c.kind : ''))).size,
      par: state.par,
    },
  };
}

function authoredState(level: AuthoredLevel): VoltCourierState {
  const board = parseBoard(level.rows);
  const result = solve(board);
  return {
    ...board,
    initialRotations: board.rotations,
    history: [],
    turns: 0,
    // An unsolvable authored board keeps par 0 so validation rejects it.
    par: result.status === 'solved' ? result.cost : 0,
  };
}

function authoredLevel(level: AuthoredLevel, source: PuzzleLevel['source']): PuzzleLevel<VoltCourierState> {
  return toLevel(authoredState(level), level.id, level.difficulty, source, `${VOLT_COURIER_ID}:${level.id}`);
}

const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);

function structureProblem(state: VoltCourierState): string | null {
  const { width, height, cells, rotations, initialRotations } = state;
  if (!isInt(width) || !isInt(height) || width < 2 || height < 2 || width > 12 || height > 12) return 'bad_dimensions';
  const n = width * height;
  if (cells.length !== n || rotations.length !== n || initialRotations.length !== n) return 'bad_cell_count';
  if (![...rotations, ...initialRotations].every((r) => isInt(r) && r >= 0 && r <= 3)) return 'bad_rotation';
  const emitters = new Map<string, number>();
  const receivers = new Map<string, number>();
  for (const c of cells) {
    if (c.t === 'emitter') emitters.set(c.kind, (emitters.get(c.kind) ?? 0) + 1);
    if (c.t === 'receiver') receivers.set(c.kind, (receivers.get(c.kind) ?? 0) + 1);
  }
  if (emitters.size === 0) return 'no_pulses';
  for (const [kind, count] of emitters) if (receivers.get(kind) !== count) return 'kind_count_mismatch';
  if (receivers.size !== emitters.size) return 'kind_count_mismatch';
  return null;
}

function hintFor(state: VoltCourierState, tier: HintTier): GameHint {
  const result = solve(state);
  if (result.status !== 'solved') {
    return { tier, text: 'Try undoing your last few turns, then follow each pulse from its emitter.', highlightIds: [] };
  }
  const target = simulate({ ...state, rotations: result.rotations });
  for (const trace of target.traces) {
    for (const step of trace.steps) {
      const cell = state.cells[step.index] as Cell;
      const current = state.rotations[step.index] ?? 0;
      const wanted = result.rotations[step.index] ?? 0;
      if (!isRotatable(cell) || sameOrientation(cell, current, wanted)) continue;
      const { label, symbol } = PULSE_KIND_INFO[trace.kind];
      if (tier === 1) {
        return {
          tier,
          text: `Follow the ${label} ${symbol} pulse from its emitter. A junction on its route is turned the wrong way.`,
          highlightIds: [cellId(trace.emitterIndex)],
        };
      }
      if (tier === 2) {
        return { tier, text: `Try turning the highlighted junction on the ${label} ${symbol} route.`, highlightIds: [cellId(step.index)] };
      }
      const turns = turnsBetween(cell, current, wanted);
      return {
        tier,
        text: `Turn the highlighted junction ${turns === 1 ? 'once' : `${turns} times`}.`,
        highlightIds: [cellId(step.index)],
      };
    }
  }
  return { tier, text: 'Every junction is lined up. Watch the pulses flow!', highlightIds: [] };
}

export const voltCourier: GameModule<VoltCourierState, VoltCourierAction> = {
  id: VOLT_COURIER_ID,
  version: VOLT_COURIER_VERSION,

  createLevel(seed, difficulty) {
    const authored = findAuthoredLevel(seed);
    if (authored) return authoredLevel(authored, 'authored');
    const key = levelSeedKey(VOLT_COURIER_ID, VOLT_COURIER_VERSION, `${seed}/${difficulty}`);
    const { state } = generateBoard(key, PROFILES[difficulty]);
    return toLevel(state, seed, difficulty, 'generated', `${VOLT_COURIER_ID}:${difficulty}:${seed}`);
  },

  fallbackLevel(difficulty) {
    return { ...authoredLevel(FALLBACK_LEVELS[difficulty], 'fallback'), difficulty };
  },

  validateLevel(level): ValidationResult {
    if (level.gameId !== VOLT_COURIER_ID) return { valid: false, reasonCode: 'wrong_game' };
    const state = level.initialState;
    const problem = structureProblem(state);
    if (problem) return { valid: false, reasonCode: problem };
    if (simulate(state).solved) return { valid: false, reasonCode: 'already_solved' };
    const result = solve(state);
    if (result.status === 'budget_exceeded') return { valid: false, reasonCode: 'solver_budget_exceeded' };
    if (result.status === 'unsolvable') return { valid: false, reasonCode: 'unsolvable' };
    if (result.cost !== state.par) return { valid: false, reasonCode: 'par_mismatch' };
    if (level.fingerprint !== boardFingerprint(state)) return { valid: false, reasonCode: 'fingerprint_mismatch' };
    return { valid: true, solutionFingerprint: fingerprint(JSON.stringify(result.rotations)) };
  },

  reduce(state, action) {
    switch (action.type) {
      case 'rotate': {
        const cell = state.cells[action.index];
        if (!isInt(action.index) || !cell || !isRotatable(cell)) return state;
        const rotations = [...state.rotations];
        rotations[action.index] = ((rotations[action.index] ?? 0) + 1) % 4;
        return {
          ...state,
          rotations,
          history: [...state.history, action.index].slice(-MAX_HISTORY),
          turns: state.turns + 1,
        };
      }
      case 'undo': {
        const last = state.history[state.history.length - 1];
        if (last === undefined) return state;
        const rotations = [...state.rotations];
        rotations[last] = ((rotations[last] ?? 0) + 3) % 4;
        return { ...state, rotations, history: state.history.slice(0, -1), turns: Math.max(0, state.turns - 1) };
      }
      case 'reset': {
        const unchanged = state.rotations.every((r, i) => r === state.initialRotations[i]);
        if (unchanged && state.history.length === 0) return state;
        return { ...state, rotations: state.initialRotations, history: [], turns: 0 };
      }
      default:
        return state;
    }
  },

  isComplete: (state) => simulate(state).solved,

  /**
   * Solving earns the base score. A bonus rewards finishing near par; hints
   * reduce only the bonus. Time is never scored (GDD §7).
   */
  score(state, { hintsUsed }: ScoreContext) {
    const extraTurns = Math.max(0, state.turns - state.par);
    const bonus = Math.max(0, MAX_EFFICIENCY_BONUS - extraTurns * 5 - hintsUsed * 10);
    return BASE_SCORE + bonus;
  },

  hint: hintFor,
};

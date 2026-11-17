import type { DifficultyBand, GameHint, GameModule, HintTier, PuzzleLevel, ValidationResult } from '@/game-runtime/contracts';
import { fingerprint, levelSeedKey } from '@/game-runtime/rng';

import { MAZE_FALLBACKS, findAuthoredMaze, parseMaze, type AuthoredMaze } from './authored';
import { generateMaze, MAZE_PROFILES } from './generator';
import { checkMove, currentValue, isFinished } from './rules';
import { solveMaze } from './solver';
import type { NumberMazeAction, NumberMazeState } from './types';

export const NUMBER_MAZE_ID = 'W2-G02';
/** Bump when the same seed would produce a different maze or rules change. */
export const NUMBER_MAZE_VERSION = '1.0.0';

const BASE_SCORE = 100;

export const roomId = (index: number) => `room-${index}`;

export function mazeFingerprint(state: Pick<NumberMazeState, 'width' | 'height' | 'cells' | 'startValue' | 'target' | 'min' | 'max'>): string {
  return fingerprint(JSON.stringify([state.width, state.height, state.cells, state.startValue, state.target, state.min, state.max]));
}

export const movesMade = (state: NumberMazeState) => state.path.length - 1;

function toLevel(state: NumberMazeState, seed: string, difficulty: DifficultyBand, source: PuzzleLevel['source'], levelId: string): PuzzleLevel<NumberMazeState> {
  return {
    gameId: NUMBER_MAZE_ID,
    levelId,
    generatorVersion: NUMBER_MAZE_VERSION,
    seed,
    difficulty,
    source,
    fingerprint: mazeFingerprint(state),
    initialState: state,
    metadata: { width: state.width, height: state.height, target: state.target, par: state.par },
  };
}

function authoredState(maze: AuthoredMaze): NumberMazeState {
  const parsed = parseMaze(maze.header, maze.rows);
  const start = parsed.cells.findIndex((c) => c.t === 'start');
  const base = { ...parsed, path: [start], values: [parsed.startValue], par: 0 };
  const result = solveMaze(base, [start], parsed.startValue);
  return { ...base, par: result.status === 'solved' ? result.moves : 0 };
}

function authoredLevel(maze: AuthoredMaze, source: PuzzleLevel['source']): PuzzleLevel<NumberMazeState> {
  return toLevel(authoredState(maze), maze.id, maze.difficulty, source, `${NUMBER_MAZE_ID}:${maze.id}`);
}

const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);

function structureProblem(s: NumberMazeState): string | null {
  if (!isInt(s.width) || !isInt(s.height) || s.width < 2 || s.height < 2 || s.width > 8 || s.height > 8) return 'bad_dimensions';
  if (s.cells.length !== s.width * s.height) return 'bad_cell_count';
  if (s.cells.filter((c) => c.t === 'start').length !== 1 || s.cells.filter((c) => c.t === 'exit').length !== 1) return 'bad_endpoints';
  if (![s.startValue, s.target, s.min, s.max].every(isInt) || s.min > s.max) return 'bad_bounds';
  if (s.startValue < s.min || s.startValue > s.max || s.target < s.min || s.target > s.max) return 'bad_bounds';
  const start = s.cells.findIndex((c) => c.t === 'start');
  if (s.path.length !== 1 || s.path[0] !== start || s.values.length !== 1 || s.values[0] !== s.startValue) return 'bad_start';
  return null;
}

/** Shortest completion from the player's current route, or the deepest earlier point that still has one. */
function rescue(state: NumberMazeState): { continuation: number[] | null; backTo: number } {
  for (let k = state.path.length; k >= 1; k -= 1) {
    const prefix = state.path.slice(0, k);
    const result = solveMaze(state, prefix, state.values[k - 1] as number);
    if (result.status === 'solved') return { continuation: k === state.path.length ? result.path.slice(k) : null, backTo: k - 1 };
  }
  return { continuation: null, backTo: 0 };
}

function hintFor(state: NumberMazeState, tier: HintTier): GameHint {
  const { continuation, backTo } = rescue(state);
  if (!continuation) {
    const cell = state.path[backTo] as number;
    return {
      tier,
      text: `This route can't reach ${state.target}. Undo back to the highlighted room (value ${state.values[backTo]}) and try another way.`,
      highlightIds: [roomId(cell)],
    };
  }
  if (tier === 1) {
    return {
      tier,
      text: `You're on track: the exit can still be reached at ${state.target} in ${continuation.length} more move${continuation.length === 1 ? '' : 's'}.`,
      highlightIds: [],
    };
  }
  const steps = continuation.slice(0, tier === 2 ? 1 : 3);
  return {
    tier,
    text: tier === 2 ? 'Step into the highlighted room next.' : 'Follow the highlighted rooms in order.',
    highlightIds: steps.map(roomId),
  };
}

export const numberMaze: GameModule<NumberMazeState, NumberMazeAction> = {
  id: NUMBER_MAZE_ID,
  version: NUMBER_MAZE_VERSION,

  createLevel(seed, difficulty) {
    const authored = findAuthoredMaze(seed);
    if (authored) return authoredLevel(authored, 'authored');
    const key = levelSeedKey(NUMBER_MAZE_ID, NUMBER_MAZE_VERSION, `${seed}/${difficulty}`);
    return toLevel(generateMaze(key, MAZE_PROFILES[difficulty]), seed, difficulty, 'generated', `${NUMBER_MAZE_ID}:${difficulty}:${seed}`);
  },

  fallbackLevel(difficulty) {
    return { ...authoredLevel(MAZE_FALLBACKS[difficulty], 'fallback'), difficulty };
  },

  validateLevel(level): ValidationResult {
    if (level.gameId !== NUMBER_MAZE_ID) return { valid: false, reasonCode: 'wrong_game' };
    const state = level.initialState;
    const problem = structureProblem(state);
    if (problem) return { valid: false, reasonCode: problem };
    const result = solveMaze(state, state.path, state.startValue);
    if (result.status === 'budget_exceeded') return { valid: false, reasonCode: 'solver_budget_exceeded' };
    if (result.status === 'unsolvable') return { valid: false, reasonCode: 'unsolvable' };
    if (result.moves !== state.par) return { valid: false, reasonCode: 'par_mismatch' };
    if (level.fingerprint !== mazeFingerprint(state)) return { valid: false, reasonCode: 'fingerprint_mismatch' };
    return { valid: true, solutionFingerprint: fingerprint(JSON.stringify(result.path)) };
  },

  reduce(state, action) {
    switch (action.type) {
      case 'move': {
        const check = checkMove(state, action.index);
        if (!check.ok) return state;
        return { ...state, path: [...state.path, action.index], values: [...state.values, check.value] };
      }
      case 'undo':
        if (state.path.length <= 1) return state;
        return { ...state, path: state.path.slice(0, -1), values: state.values.slice(0, -1) };
      case 'reset':
        if (state.path.length <= 1) return state;
        return { ...state, path: state.path.slice(0, 1), values: state.values.slice(0, 1) };
      default:
        return state;
    }
  },

  isComplete: (state) => isFinished(state) && currentValue(state) === state.target,

  /**
   * Reaching the exit earns the base score. The bonus rewards finding the
   * shortest route; hints reduce only the bonus. Undo and time are never scored.
   */
  score(state, { hintsUsed }) {
    const extra = movesMade(state) - state.par;
    const routeBonus = extra <= 0 ? 50 : extra <= 2 ? 30 : 15;
    return BASE_SCORE + Math.max(0, routeBonus - hintsUsed * 10);
  },

  hint: hintFor,
};

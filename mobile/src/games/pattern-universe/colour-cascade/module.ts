import type { DifficultyBand, GameHint, GameModule, HintTier, PuzzleLevel, ValidationResult } from '@/game-runtime/contracts';
import { fingerprint, levelSeedKey } from '@/game-runtime/rng';

import { findAuthoredGarden, GARDEN_FALLBACKS, parseGarden, type AuthoredGarden } from './authored';
import { generateGarden, GARDEN_PROFILES } from './generator';
import { applyDrop, canDrop, inBloom, padIndices } from './rules';
import { solveGarden } from './solver';
import { BLOOM_INFO, type CascadeAction, type CascadeState } from './types';

export const COLOUR_CASCADE_ID = 'W4-G02';
/** Bump when the same seed would produce a different garden or rules change. */
export const COLOUR_CASCADE_VERSION = '1.0.0';

const BASE_SCORE = 100;
const MAX_HISTORY = 30;

export const plotId = (index: number) => `plot-${index}`;

export function gardenFingerprint(state: Pick<CascadeState, 'width' | 'height' | 'cycle' | 'cells' | 'inventory'>): string {
  return fingerprint(JSON.stringify([state.width, state.height, state.cycle, state.cells, state.inventory]));
}

function toLevel(state: CascadeState, seed: string, difficulty: DifficultyBand, source: PuzzleLevel['source'], levelId: string): PuzzleLevel<CascadeState> {
  return {
    gameId: COLOUR_CASCADE_ID,
    levelId,
    generatorVersion: COLOUR_CASCADE_VERSION,
    seed,
    difficulty,
    source,
    fingerprint: gardenFingerprint(state),
    initialState: state,
    metadata: { width: state.width, height: state.height, colours: state.cycle.length, par: state.par },
  };
}

function authoredState(g: AuthoredGarden): CascadeState {
  const parsed = parseGarden(g.header, g.rows);
  const base: CascadeState = { ...parsed, drops: [], lastWave: [], history: [], par: 0 };
  const r = solveGarden(base, parsed.inventory, { maxDrops: 8 });
  return { ...base, par: r.status === 'solved' ? r.drops.length : 0 };
}

function authoredLevel(g: AuthoredGarden, source: PuzzleLevel['source']): PuzzleLevel<CascadeState> {
  return toLevel(authoredState(g), g.id, g.difficulty, source, `${COLOUR_CASCADE_ID}:${g.id}`);
}

const remainingDrops = (s: CascadeState) => Object.values(s.inventory).reduce((a, b) => a + (b ?? 0), 0);

function hintFor(state: CascadeState, tier: HintTier): GameHint {
  const r = solveGarden(state, state.inventory, { maxDrops: remainingDrops(state) });
  if (r.status !== 'solved') {
    return {
      tier,
      text: 'The garden cannot reach full bloom from here with the droplets left. Undo a drop and try a different order.',
      highlightIds: [],
    };
  }
  const next = r.drops[0];
  if (!next) return { tier, text: 'The garden is in full bloom!', highlightIds: [] };
  const final = (() => {
    let cells = state.cells;
    for (const d of r.drops) cells = applyDrop({ ...state, cells }, d.index, d.colour).cells;
    const plant = cells.find((c) => c.t === 'plant');
    return plant && plant.t === 'plant' ? plant.colour : null;
  })();
  if (tier === 1) {
    return {
      tier,
      text: final ? `Aim to turn the whole garden ${BLOOM_INFO[final].label}. Think about which colour eats which.` : 'Think about which colour eats which.',
      highlightIds: [],
    };
  }
  if (tier === 2) return { tier, text: 'Your next droplet belongs on the highlighted pad.', highlightIds: [plotId(next.index)] };
  return { tier, text: `Drop a ${BLOOM_INFO[next.colour].label} droplet on the highlighted pad.`, highlightIds: [plotId(next.index)] };
}

export const colourCascade: GameModule<CascadeState, CascadeAction> = {
  id: COLOUR_CASCADE_ID,
  version: COLOUR_CASCADE_VERSION,

  createLevel(seed, difficulty) {
    const authored = findAuthoredGarden(seed);
    if (authored) return authoredLevel(authored, 'authored');
    const key = levelSeedKey(COLOUR_CASCADE_ID, COLOUR_CASCADE_VERSION, `${seed}/${difficulty}`);
    return toLevel(generateGarden(key, GARDEN_PROFILES[difficulty]), seed, difficulty, 'generated', `${COLOUR_CASCADE_ID}:${difficulty}:${seed}`);
  },

  fallbackLevel(difficulty) {
    return { ...authoredLevel(GARDEN_FALLBACKS[difficulty], 'fallback'), difficulty };
  },

  validateLevel(level): ValidationResult {
    if (level.gameId !== COLOUR_CASCADE_ID) return { valid: false, reasonCode: 'wrong_game' };
    const s = level.initialState;
    if (!Number.isInteger(s.width) || !Number.isInteger(s.height) || s.width < 2 || s.height < 2 || s.width > 8 || s.height > 8) {
      return { valid: false, reasonCode: 'bad_dimensions' };
    }
    if (s.cells.length !== s.width * s.height) return { valid: false, reasonCode: 'bad_cell_count' };
    if (s.cycle.length < 3 || new Set(s.cycle).size !== s.cycle.length) return { valid: false, reasonCode: 'bad_cycle' };
    if (s.cells.some((c) => c.t === 'plant' && !s.cycle.includes(c.colour))) return { valid: false, reasonCode: 'colour_outside_cycle' };
    if (padIndices(s.cells).length === 0) return { valid: false, reasonCode: 'no_pads' };
    if (s.drops.length || s.history.length) return { valid: false, reasonCode: 'bad_start' };
    if (inBloom(s.cells)) return { valid: false, reasonCode: 'already_in_bloom' };
    const r = solveGarden(s, s.inventory, { maxDrops: remainingDrops(s) });
    if (r.status === 'budget_exceeded') return { valid: false, reasonCode: 'solver_budget_exceeded' };
    if (r.status === 'unsolvable') return { valid: false, reasonCode: 'unsolvable' };
    if (r.drops.length !== s.par) return { valid: false, reasonCode: 'par_mismatch' };
    if (level.fingerprint !== gardenFingerprint(s)) return { valid: false, reasonCode: 'fingerprint_mismatch' };
    return { valid: true, solutionFingerprint: fingerprint(JSON.stringify(r.drops)) };
  },

  reduce(state, action) {
    switch (action.type) {
      case 'drop': {
        if (!canDrop(state, action.index, action.colour)) return state;
        const { cells, wave } = applyDrop(state, action.index, action.colour);
        const snapshot = { cells: state.cells, inventory: state.inventory, drops: state.drops, lastWave: state.lastWave };
        return {
          ...state,
          cells,
          inventory: { ...state.inventory, [action.colour]: (state.inventory[action.colour] ?? 0) - 1 },
          drops: [...state.drops, { index: action.index, colour: action.colour }],
          lastWave: wave,
          history: [...state.history, snapshot].slice(-MAX_HISTORY),
        };
      }
      case 'undo': {
        const prev = state.history[state.history.length - 1];
        if (!prev) return state;
        return { ...state, ...prev, history: state.history.slice(0, -1) };
      }
      case 'reset': {
        const first = state.history[0];
        if (!first) return state;
        return { ...state, ...first, history: [] };
      }
      default:
        return state;
    }
  },

  isComplete: (state) => inBloom(state.cells),

  /** Full bloom earns the base score; the bonus rewards using no more droplets than par. */
  score(state, { hintsUsed }) {
    const extra = state.drops.length - state.par;
    const bonus = extra <= 0 ? 50 : 30;
    return BASE_SCORE + Math.max(0, bonus - hintsUsed * 10);
  },

  hint: hintFor,
};

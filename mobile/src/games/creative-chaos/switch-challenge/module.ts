import type { DifficultyBand, GameHint, GameModule, HintTier, PuzzleLevel, ValidationResult } from '@/game-runtime/contracts';
import { fingerprint, levelSeedKey } from '@/game-runtime/rng';

import { findAuthoredMachine, MACHINE_FALLBACKS, parseMachine, type AuthoredMachine } from './authored';
import { assembleMachine, generateMachine, MACHINE_PROFILES } from './generator';
import { applySwitch, atTarget, pressesLeft, sameDials, shortestPresses } from './rules';
import { SWITCH_NAMES, type SwitchAction, type SwitchState } from './types';

export const SWITCH_CHALLENGE_ID = 'W6-G04';
/** Bump when the same seed would produce a different machine or rules change. */
export const SWITCH_CHALLENGE_VERSION = '1.0.0';

const BASE_SCORE = 100;

export const switchId = (index: number) => `switch-${index}`;

export function machineFingerprint(s: Pick<SwitchState, 'levels' | 'start' | 'target' | 'switches' | 'budget'>): string {
  return fingerprint(JSON.stringify([s.levels, s.start, s.target, s.switches, s.budget]));
}

function toLevel(state: SwitchState, seed: string, difficulty: DifficultyBand, source: PuzzleLevel['source'], levelId: string): PuzzleLevel<SwitchState> {
  return {
    gameId: SWITCH_CHALLENGE_ID,
    levelId,
    generatorVersion: SWITCH_CHALLENGE_VERSION,
    seed,
    difficulty,
    source,
    fingerprint: machineFingerprint(state),
    initialState: state,
    metadata: { dials: state.start.length, switches: state.switches.length, levels: state.levels, par: state.par },
  };
}

function authoredState(m: AuthoredMachine): SwitchState {
  const p = parseMachine(m.header, m.switches);
  const path = shortestPresses(p.switches, p.levels, p.start, p.target);
  return assembleMachine(m.difficulty, p.levels, p.switches, p.start, p.target, path?.length ?? 0, p.slack);
}

function authoredLevel(m: AuthoredMachine, source: PuzzleLevel['source']): PuzzleLevel<SwitchState> {
  return toLevel(authoredState(m), m.id, m.difficulty, source, `${SWITCH_CHALLENGE_ID}:${m.id}`);
}

function hintFor(state: SwitchState, tier: HintTier): GameHint {
  const unknown = state.discovered.map((d, i) => (d ? -1 : i)).filter((i) => i >= 0);
  const path = shortestPresses(state.switches, state.levels, state.dials, state.target, pressesLeft(state));
  if (!path) {
    return {
      tier,
      text: 'The target cannot be reached with the presses left. Reset the machine: your wiring notes stay.',
      highlightIds: [],
    };
  }
  if (tier === 1) {
    return unknown.length > 0
      ? { tier, text: `Switch ${SWITCH_NAMES[unknown[0]!]}'s wiring is still unknown. Press it to reveal its wires.`, highlightIds: [switchId(unknown[0]!)] }
      : { tier, text: `You know every wire. The target is ${path.length} press${path.length === 1 ? '' : 'es'} away.`, highlightIds: [] };
  }
  const next = path.slice(0, tier === 2 ? 1 : 2);
  return {
    tier,
    text: tier === 2 ? 'Press the highlighted switch next.' : 'Press the highlighted switches, in order.',
    highlightIds: next.map(switchId),
  };
}

const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);

export const switchChallenge: GameModule<SwitchState, SwitchAction> = {
  id: SWITCH_CHALLENGE_ID,
  version: SWITCH_CHALLENGE_VERSION,

  createLevel(seed, difficulty) {
    const authored = findAuthoredMachine(seed);
    if (authored) return authoredLevel(authored, 'authored');
    const key = levelSeedKey(SWITCH_CHALLENGE_ID, SWITCH_CHALLENGE_VERSION, `${seed}/${difficulty}`);
    return toLevel(generateMachine(key, difficulty, MACHINE_PROFILES[difficulty]), seed, difficulty, 'generated', `${SWITCH_CHALLENGE_ID}:${difficulty}:${seed}`);
  },

  fallbackLevel(difficulty) {
    return { ...authoredLevel(MACHINE_FALLBACKS[difficulty], 'fallback'), difficulty };
  },

  validateLevel(level): ValidationResult {
    if (level.gameId !== SWITCH_CHALLENGE_ID) return { valid: false, reasonCode: 'wrong_game' };
    const s = level.initialState;
    const n = s.start.length;
    if (s.levels !== 3 && s.levels !== 4) return { valid: false, reasonCode: 'bad_levels' };
    if (n < 2 || n > 8 || s.target.length !== n || [...s.start, ...s.target].some((v) => !isInt(v) || v < 0 || v >= s.levels)) {
      return { valid: false, reasonCode: 'bad_dials' };
    }
    if (s.switches.length < 2 || s.switches.length > SWITCH_NAMES.length) return { valid: false, reasonCode: 'bad_switches' };
    for (const sw of s.switches) {
      if (sw.effects.length === 0 || sw.effects.some((e) => !isInt(e.dial) || e.dial < 0 || e.dial >= n || (e.delta !== 1 && e.delta !== -1))) {
        return { valid: false, reasonCode: 'bad_switches' };
      }
      if (sw.condition && (sw.condition.dial < 0 || sw.condition.dial >= n || sw.condition.level < 0 || sw.condition.level >= s.levels)) {
        return { valid: false, reasonCode: 'bad_switches' };
      }
    }
    if (!sameDials(s.dials, s.start) || s.presses.length || s.resets || s.discovered.some(Boolean)) return { valid: false, reasonCode: 'bad_start' };
    if (sameDials(s.start, s.target)) return { valid: false, reasonCode: 'already_solved' };
    const path = shortestPresses(s.switches, s.levels, s.start, s.target, s.budget);
    if (!path) return { valid: false, reasonCode: 'unreachable_within_budget' };
    if (path.length !== s.par) return { valid: false, reasonCode: 'par_mismatch' };
    if (s.budget < s.par) return { valid: false, reasonCode: 'budget_below_par' };
    if (level.fingerprint !== machineFingerprint(s)) return { valid: false, reasonCode: 'fingerprint_mismatch' };
    return { valid: true, solutionFingerprint: fingerprint(JSON.stringify(path)) };
  },

  reduce(state, action) {
    if (atTarget(state)) return state;
    switch (action.type) {
      case 'press': {
        const sw = state.switches[action.index];
        if (!isInt(action.index) || !sw || pressesLeft(state) <= 0) return state;
        const { dials, fired } = applySwitch(state.dials, sw, state.levels);
        const discovered = [...state.discovered];
        discovered[action.index] = true;
        return { ...state, dials, discovered, presses: [...state.presses, action.index], lastPress: { index: action.index, fired } };
      }
      case 'reset':
        if (state.presses.length === 0) return state;
        return { ...state, dials: state.start, presses: [], resets: state.resets + 1, lastPress: null };
      default:
        return state;
    }
  },

  isComplete: (state) => atTarget(state),

  /**
   * Reaching the target earns the base score. The bonus allows a few presses
   * beyond par for discovering wiring; resets and hints reduce only the bonus.
   */
  score(state, { hintsUsed }) {
    const extra = Math.max(0, state.presses.length - state.par - 2);
    return BASE_SCORE + Math.max(0, 50 - extra * 5 - state.resets * 10 - hintsUsed * 10);
  },

  hint: hintFor,
};

import { DIFFICULTY_BANDS } from '@/game-runtime/contracts';
import { makeDeps } from '@/game-runtime/__tests__/testGame';
import {
  pauseSession,
  prepareLevel,
  requestHint,
  restoreSession,
  resumeSession,
  serializeSession,
  startSession,
  submitAction,
} from '@/game-runtime/session';

import { FALLBACK_LEVELS, TUTORIAL_LEVELS } from '../authored';
import { voltCourier, VOLT_COURIER_ID, cellId, MAX_HISTORY } from '../module';
import { simulate } from '../simulate';
import type { VoltCourierState } from '../types';
import { applyAll, boardState, solvingActions } from './helpers';

const tutorial1 = () => voltCourier.createLevel('tutorial-1', 'intro');

describe('authored levels', () => {
  it.each(TUTORIAL_LEVELS.map((l) => [l.id, l] as const))('%s is valid and teaches with intro copy', (_id, l) => {
    const level = voltCourier.createLevel(l.id, l.difficulty);
    expect(level.source).toBe('authored');
    expect(voltCourier.validateLevel(level).valid).toBe(true);
    expect(l.intro.length).toBeGreaterThan(20);
  });

  it('tutorials introduce one idea at a time', () => {
    const features = TUTORIAL_LEVELS.map((l) => {
      const s = voltCourier.createLevel(l.id, l.difficulty).initialState;
      return {
        kinds: new Set(s.cells.flatMap((c) => (c.t === 'emitter' ? [c.kind] : []))).size,
        crosses: s.cells.filter((c) => c.t === 'cross').length,
      };
    });
    expect(features).toEqual([
      { kinds: 1, crosses: 0 },
      { kinds: 2, crosses: 0 },
      { kinds: 2, crosses: 1 },
    ]);
  });

  it.each(DIFFICULTY_BANDS)('the %s fallback is valid and labelled as fallback', (band) => {
    const level = voltCourier.fallbackLevel(band);
    expect(level.source).toBe('fallback');
    expect(level.difficulty).toBe(band);
    expect(voltCourier.validateLevel(level).valid).toBe(true);
    expect(level.levelId).toBe(`${VOLT_COURIER_ID}:${FALLBACK_LEVELS[band].id}`);
  });
});

describe('validateLevel', () => {
  const valid = tutorial1();
  const withState = (patch: Partial<VoltCourierState>) => ({
    ...valid,
    initialState: { ...valid.initialState, ...patch },
  });

  it('accepts a valid level with a solution certificate', () => {
    expect(voltCourier.validateLevel(valid)).toEqual({ valid: true, solutionFingerprint: expect.stringMatching(/^[0-9a-f]{16}$/) });
  });

  it.each([
    ['wrong_game', { ...valid, gameId: 'W1-G01' }],
    ['bad_dimensions', withState({ width: 1 })],
    ['bad_cell_count', withState({ rotations: [0] })],
    ['bad_rotation', withState({ rotations: valid.initialState.rotations.map(() => 7) })],
    ['par_mismatch', withState({ par: 99 })],
    ['fingerprint_mismatch', { ...valid, fingerprint: '0000000000000000' }],
  ])('rejects %s', (reasonCode, level) => {
    expect(voltCourier.validateLevel(level)).toEqual({ valid: false, reasonCode });
  });

  it('rejects an already solved board', () => {
    const state = boardState(['EsE S1 Rs', '..  .. ..']);
    expect(voltCourier.validateLevel({ ...valid, initialState: state })).toEqual({ valid: false, reasonCode: 'already_solved' });
  });

  it('rejects unsolvable boards and kind mismatches', () => {
    const unsolvable = boardState(['EsE s0 Rs', '..  .. ..']);
    expect(voltCourier.validateLevel({ ...valid, initialState: unsolvable }).reasonCode).toBe('unsolvable');
    const mismatch = boardState(['EsE S0 Rw', '..  .. ..']);
    expect(voltCourier.validateLevel({ ...valid, initialState: mismatch }).reasonCode).toBe('kind_count_mismatch');
  });
});

describe('reduce', () => {
  const state = tutorial1().initialState;
  const straightIndex = 1;
  const emitterIndex = 0;

  it('rotates a conduit clockwise and records history', () => {
    const next = voltCourier.reduce(state, { type: 'rotate', index: straightIndex });
    expect(next.rotations[straightIndex]).toBe(((state.rotations[straightIndex] ?? 0) + 1) % 4);
    expect(next.history).toEqual([straightIndex]);
    expect(next.turns).toBe(1);
    expect(state.turns).toBe(0); // previous state untouched
  });

  it.each([
    ['an emitter', { type: 'rotate', index: emitterIndex } as const],
    ['an empty cell', { type: 'rotate', index: 4 } as const],
    ['an index off the board', { type: 'rotate', index: 999 } as const],
    ['a negative index', { type: 'rotate', index: -1 } as const],
    ['a fractional index', { type: 'rotate', index: 1.5 } as const],
    ['undo with no history', { type: 'undo' } as const],
    ['reset when nothing changed', { type: 'reset' } as const],
  ])('ignores %s by returning the same state', (_name, action) => {
    expect(voltCourier.reduce(state, action)).toBe(state);
  });

  it('ignores locked conduits, gates and crossings', () => {
    const s = boardState(['EsE s0 Gs1 X B0 Rs']);
    for (const index of [1, 2, 3]) expect(voltCourier.reduce(s, { type: 'rotate', index })).toBe(s);
    expect(voltCourier.reduce(s, { type: 'rotate', index: 4 })).not.toBe(s);
  });

  it('undo reverses the last rotation', () => {
    const rotated = applyAll(state, [
      { type: 'rotate', index: 1 },
      { type: 'rotate', index: 3 },
    ]);
    const undone = voltCourier.reduce(rotated, { type: 'undo' });
    expect(undone.rotations[3]).toBe(state.rotations[3]);
    expect(undone.rotations[1]).toBe(rotated.rotations[1]);
    expect(undone.history).toEqual([1]);
    expect(undone.turns).toBe(1);
  });

  it('reset restores the starting rotations', () => {
    const rotated = applyAll(state, [{ type: 'rotate', index: 1 }]);
    const reset = voltCourier.reduce(rotated, { type: 'reset' });
    expect(reset.rotations).toEqual(state.initialRotations);
    expect(reset.history).toEqual([]);
    expect(reset.turns).toBe(0);
  });

  it('caps undo history', () => {
    const many = applyAll(state, Array.from({ length: MAX_HISTORY + 20 }, () => ({ type: 'rotate', index: 1 }) as const));
    expect(many.history).toHaveLength(MAX_HISTORY);
  });

  it('is deterministic for the same action sequence', () => {
    const actions = solvingActions(state);
    expect(applyAll(state, actions)).toEqual(applyAll(state, actions));
  });
});

describe('scoring', () => {
  const state = tutorial1().initialState;
  const solved = applyAll(state, solvingActions(state));

  it('awards the full bonus at par without hints', () => {
    expect(solved.turns).toBe(state.par);
    expect(voltCourier.isComplete(solved)).toBe(true);
    expect(voltCourier.score(solved, { moves: solved.turns, hintsUsed: 0 })).toBe(150);
  });

  it('reduces only the bonus for extra turns and hints, never below the base', () => {
    expect(voltCourier.score({ ...solved, turns: state.par + 2 }, { moves: 0, hintsUsed: 0 })).toBe(140);
    expect(voltCourier.score(solved, { moves: 0, hintsUsed: 1 })).toBe(140);
    expect(voltCourier.score({ ...solved, turns: state.par + 50 }, { moves: 0, hintsUsed: 5 })).toBe(100);
  });

  it('does not penalise undo', () => {
    const wobble = applyAll(state, [{ type: 'rotate', index: 1 }, { type: 'undo' }, ...solvingActions(state)]);
    expect(voltCourier.isComplete(wobble)).toBe(true);
    expect(voltCourier.score(wobble, { moves: 0, hintsUsed: 0 })).toBe(150);
  });
});

describe('hints', () => {
  const state = tutorial1().initialState;

  it('escalate from the pulse to the junction to the exact turn count', () => {
    const h1 = voltCourier.hint!(state, 1);
    const h2 = voltCourier.hint!(state, 2);
    const h3 = voltCourier.hint!(state, 3);
    expect(h1.highlightIds).toEqual([cellId(0)]);
    expect(h1.text).toContain('Spark');
    expect(h2.highlightIds).toHaveLength(1);
    expect(h2.highlightIds[0]).not.toBe(cellId(0));
    expect(h3.highlightIds).toEqual(h2.highlightIds);
    expect(h3.text).toMatch(/once|\d+ times/);
  });

  it('following tier-3 hints solves the board', () => {
    let s = state;
    for (let i = 0; i < 20 && !voltCourier.isComplete(s); i += 1) {
      const hint = voltCourier.hint!(s, 3);
      const index = Number(hint.highlightIds[0]?.replace('cell-', ''));
      const turns = hint.text.includes('once') ? 1 : Number(/(\d+) times/.exec(hint.text)?.[1]);
      for (let t = 0; t < turns; t += 1) s = voltCourier.reduce(s, { type: 'rotate', index });
    }
    expect(voltCourier.isComplete(s)).toBe(true);
  });

  it('says so when the board is already lined up', () => {
    const solved = applyAll(state, solvingActions(state));
    expect(voltCourier.hint!(solved, 2).highlightIds).toEqual([]);
  });
});

describe('through the game runtime', () => {
  it('plays a generated level offline from start to completion exactly once', () => {
    const deps = makeDeps();
    let { session } = startSession(voltCourier, { seed: 'runtime-1', difficulty: 'standard' }, deps);
    expect(session.status).toBe('playing');
    const actions = solvingActions(session.state);
    const completions: string[] = [];
    for (const action of actions) {
      const step = submitAction(voltCourier, session, action, deps);
      session = step.session;
      completions.push(...step.events.filter((e) => e.type === 'level_completed').map((e) => e.type));
    }
    expect(session.status).toBe('succeeded');
    expect(completions).toEqual(['level_completed']);
    expect(session.score).toBe(150);
    const after = submitAction(voltCourier, session, actions[0]!, deps);
    expect(after.session).toBe(session);
  });

  it('does not count invalid taps as moves', () => {
    const deps = makeDeps();
    const { session } = startSession(voltCourier, { seed: 'tutorial-1', difficulty: 'intro' }, deps);
    const step = submitAction(voltCourier, session, { type: 'rotate', index: 0 }, deps);
    expect(step.session).toBe(session);
    expect(step.events).toEqual([]);
  });

  it('survives pause, app kill and restore with the board intact', () => {
    const deps = makeDeps();
    let { session } = startSession(voltCourier, { seed: 'restore-1', difficulty: 'advanced' }, deps);
    const actions = solvingActions(session.state);
    const half = Math.floor(actions.length / 2);
    for (const action of actions.slice(0, half)) session = submitAction(voltCourier, session, action, deps).session;
    session = pauseSession(session, deps).session;

    const restored = restoreSession(voltCourier, serializeSession(session));
    expect(restored?.state).toEqual(session.state);
    let resumed = resumeSession(restored!, deps).session;
    for (const action of actions.slice(half)) resumed = submitAction(voltCourier, resumed, action, deps).session;
    expect(resumed.status).toBe('succeeded');
  });

  it('hints through the runtime escalate and are counted', () => {
    const deps = makeDeps();
    let { session } = startSession(voltCourier, { seed: 'tutorial-2', difficulty: 'easy' }, deps);
    const tiers: number[] = [];
    for (let i = 0; i < 3; i += 1) {
      const r = requestHint(voltCourier, session, deps);
      session = r.session;
      tiers.push(r.hint?.tier ?? 0);
    }
    expect(tiers).toEqual([1, 2, 3]);
    expect(session.hintsUsed).toBe(3);
  });

  it('prepareLevel serves a validated level for every band', () => {
    for (const band of DIFFICULTY_BANDS) {
      const level = prepareLevel(voltCourier, 'prepare', band);
      expect(voltCourier.validateLevel(level).valid).toBe(true);
      expect(simulate(level.initialState).solved).toBe(false);
    }
  });
});

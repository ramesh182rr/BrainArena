import { DIFFICULTY_BANDS } from '@/game-runtime/contracts';
import { makeDeps } from '@/game-runtime/__tests__/testGame';
import { pauseSession, restoreSession, resumeSession, serializeSession, startSession, submitAction } from '@/game-runtime/session';

import { MACHINE_TUTORIALS } from '../authored';
import { switchChallenge, switchId } from '../module';
import type { SwitchState } from '../types';
import { apply, solvingPresses } from './helpers';

const t3 = () => switchChallenge.createLevel('tutorial-3', 'advanced').initialState;

describe('authored machines', () => {
  it.each(MACHINE_TUTORIALS.map((t) => [t.id, t] as const))('%s is valid', (_id, t) => {
    expect(switchChallenge.validateLevel(switchChallenge.createLevel(t.id, t.difficulty)).valid).toBe(true);
  });

  it('tutorials introduce discovery, lowering, locks and four levels', () => {
    const s = MACHINE_TUTORIALS.map((t) => switchChallenge.createLevel(t.id, t.difficulty).initialState);
    expect(s[0]!.switches.every((sw) => sw.effects.every((e) => e.delta === 1))).toBe(true);
    expect(s[1]!.switches.some((sw) => sw.effects.some((e) => e.delta === -1))).toBe(true);
    expect(s[2]!.switches.some((sw) => sw.condition)).toBe(true);
    expect(s[3]!.levels).toBe(4);
  });

  it.each(DIFFICULTY_BANDS)('the %s fallback is valid', (band) => {
    expect(switchChallenge.validateLevel(switchChallenge.fallbackLevel(band)).valid).toBe(true);
  });
});

describe('validateLevel', () => {
  const level = switchChallenge.createLevel('tutorial-1', 'intro');
  const patch = (p: Partial<SwitchState>) => ({ ...level, initialState: { ...level.initialState, ...p } });
  it.each([
    ['wrong_game', { ...level, gameId: 'x' }],
    ['bad_levels', patch({ levels: 7 })],
    ['bad_dials', patch({ target: [0, 9, 0] })],
    ['bad_switches', patch({ switches: [{ effects: [], condition: null }, { effects: [], condition: null }] })],
    ['bad_start', patch({ resets: 1 })],
    ['already_solved', patch({ target: level.initialState.start })],
    ['unreachable_within_budget', patch({ budget: 1 })],
    ['par_mismatch', patch({ par: 1 })],
    ['fingerprint_mismatch', { ...level, fingerprint: 'x' }],
  ])('rejects %s', (reasonCode, bad) => {
    expect(switchChallenge.validateLevel(bad)).toEqual({ valid: false, reasonCode });
  });
});

describe('reduce', () => {
  it('presses reveal wiring, spend budget and report whether they fired', () => {
    const s = t3();
    const a = switchChallenge.reduce(s, { type: 'press', index: 1 });
    expect(a.lastPress).toEqual({ index: 1, fired: false });
    expect(a.dials).toEqual(s.dials);
    expect(a.discovered).toEqual([false, true, false]);
    expect(a.presses).toEqual([1]);
    const b = apply(a, [{ type: 'press', index: 0 }, { type: 'press', index: 1 }]);
    expect(b.lastPress).toEqual({ index: 1, fired: true });
  });

  it('stops at the budget; reset restores the machine but keeps discoveries', () => {
    let s = t3();
    for (let i = 0; i < s.budget + 3; i += 1) s = switchChallenge.reduce(s, { type: 'press', index: 2 });
    expect(s.presses).toHaveLength(t3().budget);
    const reset = switchChallenge.reduce(s, { type: 'reset' });
    expect(reset).toMatchObject({ dials: t3().start, presses: [], resets: 1, lastPress: null });
    expect(reset.discovered[2]).toBe(true);
    expect(switchChallenge.reduce(reset, { type: 'reset' })).toBe(reset);
  });

  it.each([
    ['a missing switch', { type: 'press', index: 9 } as const],
    ['a fractional index', { type: 'press', index: 0.5 } as const],
    ['reset at the start', { type: 'reset' } as const],
  ])('ignores %s', (_n, action) => {
    const s = t3();
    expect(switchChallenge.reduce(s, action)).toBe(s);
  });

  it('completes on the target and then ignores input', () => {
    const s = t3();
    const done = apply(s, solvingPresses(s));
    expect(switchChallenge.isComplete(done)).toBe(true);
    expect(switchChallenge.reduce(done, { type: 'press', index: 0 })).toBe(done);
  });
});

describe('scoring and hints', () => {
  it('allows two discovery presses free; resets and hints lower only the bonus', () => {
    const s = t3();
    const done = apply(s, solvingPresses(s));
    expect(switchChallenge.score(done, { moves: 0, hintsUsed: 0 })).toBe(150);
    expect(switchChallenge.score({ ...done, presses: [...done.presses, 0, 0] }, { moves: 0, hintsUsed: 0 })).toBe(150);
    expect(switchChallenge.score({ ...done, presses: [...done.presses, 0, 0, 0] }, { moves: 0, hintsUsed: 0 })).toBe(145);
    expect(switchChallenge.score({ ...done, resets: 1 }, { moves: 0, hintsUsed: 1 })).toBe(130);
    expect(switchChallenge.score({ ...done, resets: 9 }, { moves: 0, hintsUsed: 0 })).toBe(100);
  });

  it('hints point at unknown wiring, then the next presses, and spot dead ends', () => {
    const s = t3();
    expect(switchChallenge.hint!(s, 1)).toMatchObject({ highlightIds: [switchId(0)] });
    const next = solvingPresses(s)[0]!;
    expect(switchChallenge.hint!(s, 2).highlightIds).toEqual([switchId((next as { index: number }).index)]);
    expect(switchChallenge.hint!(s, 3).highlightIds).toHaveLength(2);
    let wasted = s;
    for (let i = 0; i < s.budget - 1; i += 1) wasted = switchChallenge.reduce(wasted, { type: 'press', index: 2 });
    expect(switchChallenge.hint!(wasted, 1).text).toMatch(/Reset the machine/);
  });
});

describe('through the game runtime', () => {
  it('plays a generated machine, survives restore and completes once', () => {
    const deps = makeDeps();
    let { session } = startSession(switchChallenge, { seed: 'runtime', difficulty: 'expert' }, deps);
    const presses = solvingPresses(session.state);
    session = submitAction(switchChallenge, session, presses[0]!, deps).session;
    session = resumeSession(restoreSession(switchChallenge, serializeSession(pauseSession(session, deps).session))!, deps).session;
    const types: string[] = [];
    for (const p of presses.slice(1)) {
      const r = submitAction(switchChallenge, session, p, deps);
      session = r.session;
      types.push(...r.events.map((e) => e.type));
    }
    expect(session.status).toBe('succeeded');
    expect(types.filter((t) => t === 'level_completed')).toHaveLength(1);
  });
});

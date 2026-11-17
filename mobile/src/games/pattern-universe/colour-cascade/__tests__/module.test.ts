import { DIFFICULTY_BANDS } from '@/game-runtime/contracts';
import { makeDeps } from '@/game-runtime/__tests__/testGame';
import { pauseSession, restoreSession, resumeSession, serializeSession, startSession, submitAction } from '@/game-runtime/session';

import { GARDEN_TUTORIALS } from '../authored';
import { colourCascade, plotId } from '../module';
import type { CascadeState } from '../types';
import { applyAll, gardenState, solvingDrops } from './helpers';

const t2 = () => colourCascade.createLevel('tutorial-2', 'easy').initialState;

describe('authored gardens', () => {
  it.each(GARDEN_TUTORIALS.map((t) => [t.id, t] as const))('%s is valid', (_id, t) => {
    expect(colourCascade.validateLevel(colourCascade.createLevel(t.id, t.difficulty)).valid).toBe(true);
  });

  it('tutorials introduce cascade, order, shells and four colours', () => {
    const states = GARDEN_TUTORIALS.map((t) => colourCascade.createLevel(t.id, t.difficulty).initialState);
    expect(states.map((s) => s.par)).toEqual([1, 2, 3, 3]);
    expect(states[2]!.cells.some((c) => c.t === 'plant' && c.hardy)).toBe(true);
    expect(states[3]!.cycle).toHaveLength(4);
  });

  it.each(DIFFICULTY_BANDS)('the %s fallback is valid', (band) => {
    expect(colourCascade.validateLevel(colourCascade.fallbackLevel(band)).valid).toBe(true);
  });
});

describe('validateLevel', () => {
  const level = colourCascade.createLevel('tutorial-2', 'easy');
  const patch = (p: Partial<CascadeState>) => ({ ...level, initialState: { ...level.initialState, ...p } });
  it.each([
    ['wrong_game', { ...level, gameId: 'x' }],
    ['bad_dimensions', patch({ width: 1 })],
    ['bad_cycle', patch({ cycle: ['rose', 'rose', 'sky'] })],
    ['no_pads', patch({ cells: level.initialState.cells.map((c) => (c.t === 'plant' ? { ...c, pad: false } : c)) })],
    ['bad_start', patch({ drops: [{ index: 0, colour: 'sky' }] })],
    ['unsolvable', patch({ inventory: { rose: 1 } })],
    ['par_mismatch', patch({ par: 9 })],
    ['fingerprint_mismatch', { ...level, fingerprint: 'x' }],
  ])('rejects %s', (reasonCode, bad) => {
    expect(colourCascade.validateLevel(bad)).toEqual({ valid: false, reasonCode });
  });

  it('rejects a garden already in bloom', () => {
    const s = gardenState('cycle=rose,leaf,sky inventory=rose:1', ['R @R', 'R R']);
    expect(colourCascade.validateLevel({ ...level, initialState: s }).reasonCode).toBe('already_in_bloom');
  });
});

describe('reduce', () => {
  it('drops, spends droplets, records the wave, undoes and resets', () => {
    const s = t2();
    const a = colourCascade.reduce(s, { type: 'drop', index: 8, colour: 'sky' });
    expect(a.inventory.sky).toBe(0);
    expect(a.lastWave.length).toBeGreaterThan(1);
    expect(colourCascade.reduce(a, { type: 'undo' }).cells).toEqual(s.cells);
    const b = applyAll(s, [{ type: 'drop', index: 8, colour: 'sky' }, { type: 'reset' }]);
    expect(b.inventory).toEqual(s.inventory);
    expect(b.drops).toEqual([]);
  });

  it.each([
    ['a drop off a pad', { type: 'drop', index: 1, colour: 'sky' } as const],
    ['a colour with no droplets', { type: 'drop', index: 0, colour: 'rose' } as const],
    ['undo at the start', { type: 'undo' } as const],
    ['reset at the start', { type: 'reset' } as const],
  ])('ignores %s', (_n, action) => {
    const s = t2();
    expect(colourCascade.reduce(s, action)).toBe(s);
  });

  it('order matters: the wrong order leaves the garden mixed', () => {
    const s = t2();
    const wrong = applyAll(s, [{ type: 'drop', index: 0, colour: 'leaf' }, { type: 'drop', index: 8, colour: 'sky' }]);
    expect(colourCascade.isComplete(wrong)).toBe(false);
    expect(colourCascade.isComplete(applyAll(s, solvingDrops(s)))).toBe(true);
  });
});

describe('scoring and hints', () => {
  it('scores par solves at 150 and lowers only the bonus', () => {
    const s = t2();
    const done = applyAll(s, solvingDrops(s));
    expect(colourCascade.score(done, { moves: 0, hintsUsed: 0 })).toBe(150);
    expect(colourCascade.score({ ...done, drops: [...done.drops, done.drops[0]!] }, { moves: 0, hintsUsed: 0 })).toBe(130);
    expect(colourCascade.score(done, { moves: 0, hintsUsed: 6 })).toBe(100);
  });

  it('hints aim, point to the pad, then name the droplet', () => {
    const s = t2();
    expect(colourCascade.hint!(s, 1).text).toMatch(/whole garden Leaf/);
    expect(colourCascade.hint!(s, 2).highlightIds).toEqual([plotId(8)]);
    expect(colourCascade.hint!(s, 3).text).toBe('Drop a Sky droplet on the highlighted pad.');
    const stuck = colourCascade.reduce(s, { type: 'drop', index: 0, colour: 'leaf' });
    expect(colourCascade.hint!(stuck, 1).text).toMatch(/Undo a drop/);
  });
});

describe('through the game runtime', () => {
  it('plays a generated garden, survives restore and completes once', () => {
    const deps = makeDeps();
    let { session } = startSession(colourCascade, { seed: 'runtime', difficulty: 'advanced' }, deps);
    const drops = solvingDrops(session.state);
    session = submitAction(colourCascade, session, drops[0]!, deps).session;
    session = resumeSession(restoreSession(colourCascade, serializeSession(pauseSession(session, deps).session))!, deps).session;
    const types: string[] = [];
    for (const d of drops.slice(1)) {
      const r = submitAction(colourCascade, session, d, deps);
      session = r.session;
      types.push(...r.events.map((e) => e.type));
    }
    expect(session.status).toBe('succeeded');
    expect(types.filter((t) => t === 'level_completed')).toHaveLength(1);
  });
});

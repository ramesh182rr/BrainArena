import { fireEvent, render, screen } from '@testing-library/react-native';

import { DIFFICULTY_BANDS } from '@/game-runtime/contracts';
import { makeDeps } from '@/game-runtime/__tests__/testGame';
import { startSession, submitAction } from '@/game-runtime/session';
import { createRng } from '@/game-runtime/rng';

import { whatsChangedUi } from '../board';
import { buildScene, CHANGED_PROFILES, CHANGED_TUTORIALS, changedCells, whatsChanged, type ChangedState } from '../logic';

jest.setTimeout(120_000);

function spotAll(s0: ChangedState, wrong = false): ChangedState {
  let s = whatsChanged.reduce(s0, { type: 'watch' });
  s = whatsChanged.reduce(s, { type: 'studied' });
  const cells = changedCells(s.changes);
  const marks = wrong ? [...cells.slice(1), s.before.findIndex((_, i) => !cells.includes(i))] : cells;
  for (const c of marks) s = whatsChanged.reduce(s, { type: 'toggle', cell: c });
  return whatsChanged.reduce(s, { type: 'check' });
}

describe("What's Changed? scenes", () => {
  it('changed squares are exactly where the scenes differ, for every kind', () => {
    const rng = createRng('scenes');
    for (let i = 0; i < 300; i += 1) {
      const sc = buildScene(rng, 4, { objects: 8, changes: 3, kinds: ['vanish', 'appear', 'move', 'recolour', 'swap'] });
      const differs = sc.before.flatMap((o, k) => (JSON.stringify(o) !== JSON.stringify(sc.after[k]) ? [k] : []));
      expect(differs).toEqual(changedCells(sc.changes));
      expect(sc.changes).toHaveLength(3);
      expect(sc.before.filter(Boolean)).toHaveLength(8);
    }
  });

  it('moves and swaps touch two squares', () => {
    const rng = createRng('two');
    const move = buildScene(rng, 3, { objects: 4, changes: 1, kinds: ['move'] });
    expect(move.changes[0]!.cells).toHaveLength(2);
    const swap = buildScene(rng, 3, { objects: 4, changes: 1, kinds: ['swap'] });
    expect(swap.changes[0]!.cells).toHaveLength(2);
  });
});

describe("What's Changed? levels", () => {
  it.each(DIFFICULTY_BANDS)('%s: 200 seeds validate within the band', (band) => {
    for (let i = 0; i < 200; i += 1) {
      const level = whatsChanged.createLevel(`p-${i}`, band);
      expect({ i, ok: whatsChanged.validateLevel(level).valid }).toEqual({ i, ok: true });
      expect(level.initialState.grid).toBe(CHANGED_PROFILES[band].grid);
    }
    expect(whatsChanged.createLevel('d', band)).toEqual(whatsChanged.createLevel('d', band));
    expect(whatsChanged.validateLevel(whatsChanged.fallbackLevel(band)).valid).toBe(true);
  });

  it('tutorials validate; a miss gives a fresh scene; marking all completes; scores', () => {
    for (const t of CHANGED_TUTORIALS) expect(whatsChanged.validateLevel(whatsChanged.createLevel(t.id, t.difficulty)).valid).toBe(true);
    const s0 = whatsChanged.createLevel('w', 'easy').initialState;
    const studying = whatsChanged.reduce(s0, { type: 'watch' });
    expect(whatsChanged.reduce(studying, { type: 'check' })).toBe(studying);
    const miss = spotAll(s0, true);
    expect(miss.lastResult?.correct).toBe(false);
    expect(miss.misses).toBe(1);
    const retry = whatsChanged.reduce(miss, { type: 'watch' });
    expect(retry.before).not.toEqual(s0.before);
    let s = spotAll(spotAll(retry.phase === 'study' ? { ...retry, phase: 'ready' } : retry));
    expect(s.round).toBe(1);
    s = spotAll(s);
    expect(whatsChanged.isComplete(spotAll(s0))).toBe(false);
    expect(whatsChanged.isComplete(s)).toBe(true);
    expect(whatsChanged.score(s, { moves: 0, hintsUsed: 0 })).toBe(135);
  });

  it('check needs exactly as many marks as changed squares; toggling unmarks', () => {
    let s = whatsChanged.reduce(whatsChanged.reduce(whatsChanged.createLevel('tutorial-2', 'easy').initialState, { type: 'watch' }), { type: 'studied' });
    s = whatsChanged.reduce(s, { type: 'toggle', cell: 0 });
    expect(whatsChanged.reduce(s, { type: 'check' })).toBe(s);
    expect(whatsChanged.reduce(s, { type: 'toggle', cell: 0 }).marks).toEqual([]);
  });

  it('hints describe then point at changed squares', () => {
    let s = whatsChanged.createLevel('tutorial-3', 'advanced').initialState;
    expect(whatsChanged.hint!(s, 1).highlightIds).toEqual([]);
    s = whatsChanged.reduce(whatsChanged.reduce(s, { type: 'watch' }), { type: 'studied' });
    expect(whatsChanged.hint!(s, 1).text).toMatch(/changed colour|swapped/);
    expect(whatsChanged.hint!(s, 3).highlightIds).toHaveLength(2);
  });

  it('plays through the runtime', () => {
    const deps = makeDeps();
    let { session } = startSession(whatsChanged, { seed: 'rt', difficulty: 'expert' }, deps);
    while (session.status !== 'succeeded') {
      session = submitAction(whatsChanged, session, { type: 'watch' }, deps).session;
      session = submitAction(whatsChanged, session, { type: 'studied' }, deps).session;
      for (const c of changedCells(session.state.changes)) session = submitAction(whatsChanged, session, { type: 'toggle', cell: c }, deps).session;
      session = submitAction(whatsChanged, session, { type: 'check' }, deps).session;
    }
    expect(session.state.misses).toBe(0);
  });

  it('renders study, spot and feedback', async () => {
    const onAction = jest.fn();
    const { Board } = whatsChangedUi;
    const s0 = whatsChanged.createLevel('tutorial-1', 'intro').initialState;
    const view = await render(<Board state={s0} onAction={onAction} highlightIds={[]} disabled={false} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Study' }));
    expect(onAction).toHaveBeenCalledWith({ type: 'watch' });
    const spot = whatsChanged.reduce(whatsChanged.reduce(s0, { type: 'watch' }), { type: 'studied' });
    await view.rerender(<Board state={spot} onAction={onAction} highlightIds={[]} disabled={false} />);
    await fireEvent.press(screen.getAllByLabelText(/Tap to mark as changed/)[0]!);
    expect(onAction).toHaveBeenCalledWith({ type: 'toggle', cell: 0 });
    await view.rerender(<Board state={spotAll(s0, true)} onAction={onAction} highlightIds={[]} disabled={false} />);
    expect(screen.getByText('Not quite. Here is what changed:')).toBeTruthy();
  });
});

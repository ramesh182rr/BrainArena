import { fireEvent, render, screen } from '@testing-library/react-native';

import { DIFFICULTY_BANDS } from '@/game-runtime/contracts';
import { makeDeps } from '@/game-runtime/__tests__/testGame';
import { startSession, submitAction } from '@/game-runtime/session';

import { memoryDetectiveUi } from '../board';
import { comparePairs, DETECTIVE_PROFILES, DETECTIVE_TUTORIALS, memoryDetective, type DetectiveState } from '../logic';

jest.setTimeout(120_000);

/** Rebuild the room shifted by one square right and down (still a perfect arrangement), or mirrored. */
function rebuild(s0: DetectiveState, mirrored = false): DetectiveState {
  let s = memoryDetective.reduce(memoryDetective.reduce(s0, { type: 'watch' }), { type: 'studied' });
  s.items.forEach((it, i) => {
    const r = Math.floor(it.cell / s.sceneSize);
    const c = it.cell % s.sceneSize;
    const cell = mirrored ? r * s.mapSize + (s.sceneSize - 1 - c) : (r + 1) * s.mapSize + c + 1;
    s = memoryDetective.reduce(s, { type: 'select', item: i });
    s = memoryDetective.reduce(s, { type: 'place', cell });
  });
  return memoryDetective.reduce(s, { type: 'check' });
}

describe('Memory Detective relations', () => {
  it('counts only relative arrangement, so a shifted copy is perfect and a mirror is wrong', () => {
    const items = [{ obj: 0, cell: 0 }, { obj: 1, cell: 4 }, { obj: 2, cell: 2 }];
    const shifted = comparePairs(3, 4, items, [5, 10, 7]);
    expect(shifted.every((p) => p.ok)).toBe(true);
    const mirrored = comparePairs(3, 4, items, [2, 5, 0]);
    expect(mirrored.filter((p) => p.ok).length).toBeLessThan(3);
  });
});

describe('Memory Detective levels', () => {
  it.each(DIFFICULTY_BANDS)('%s: 200 seeds validate', (band) => {
    for (let i = 0; i < 200; i += 1) {
      const level = memoryDetective.createLevel(`p-${i}`, band);
      expect({ i, ok: memoryDetective.validateLevel(level).valid }).toEqual({ i, ok: true });
      expect(level.initialState.rounds).toEqual(DETECTIVE_PROFILES[band].rounds);
    }
    expect(memoryDetective.createLevel('d', band)).toEqual(memoryDetective.createLevel('d', band));
    expect(memoryDetective.validateLevel(memoryDetective.fallbackLevel(band)).valid).toBe(true);
  });

  it('tutorials validate; a mirrored room misses with a fresh room; shifted rooms pass; scores', () => {
    for (const t of DETECTIVE_TUTORIALS) expect(memoryDetective.validateLevel(memoryDetective.createLevel(t.id, t.difficulty)).valid).toBe(true);
    const s0 = memoryDetective.createLevel('w', 'standard').initialState;
    const miss = rebuild(s0, true);
    expect(miss.lastResult?.passed).toBe(false);
    expect(miss.misses).toBe(1);
    expect(memoryDetective.reduce(miss, { type: 'watch' }).items).not.toEqual(s0.items);
    let s = rebuild(miss);
    expect(s.round).toBe(1);
    s = rebuild(rebuild(s));
    expect(memoryDetective.isComplete(s)).toBe(true);
    expect(memoryDetective.score(s, { moves: 0, hintsUsed: 0 })).toBe(135);
  });

  it('hints name an anchor, then show squares', () => {
    let s = memoryDetective.createLevel('tutorial-3', 'standard').initialState;
    s = memoryDetective.reduce(memoryDetective.reduce(s, { type: 'watch' }), { type: 'studied' });
    expect(memoryDetective.hint!(s, 1).text).toMatch(/top-left/);
    expect(memoryDetective.hint!(s, 3).highlightIds).toHaveLength(2);
  });

  it('plays through the runtime', () => {
    const deps = makeDeps();
    let { session } = startSession(memoryDetective, { seed: 'rt', difficulty: 'expert' }, deps);
    while (session.status !== 'succeeded') {
      session = submitAction(memoryDetective, session, { type: 'watch' }, deps).session;
      session = submitAction(memoryDetective, session, { type: 'studied' }, deps).session;
      const st = session.state;
      for (const it of st.items) session = submitAction(memoryDetective, session, { type: 'place', cell: Math.floor(it.cell / st.sceneSize) * st.mapSize + (it.cell % st.sceneSize) }, deps).session;
      session = submitAction(memoryDetective, session, { type: 'check' }, deps).session;
    }
    expect(session.state.misses).toBe(0);
  });

  it('renders study, placing and feedback', async () => {
    const onAction = jest.fn();
    const { Board } = memoryDetectiveUi;
    const s0 = memoryDetective.createLevel('tutorial-1', 'intro').initialState;
    const view = await render(<Board state={s0} onAction={onAction} highlightIds={[]} disabled={false} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Study' }));
    expect(onAction).toHaveBeenCalledWith({ type: 'watch' });
    const placing = memoryDetective.reduce(memoryDetective.reduce(s0, { type: 'watch' }), { type: 'studied' });
    await view.rerender(<Board state={placing} onAction={onAction} highlightIds={[]} disabled={false} />);
    await fireEvent.press(screen.getByTestId('square-0'));
    expect(onAction).toHaveBeenCalledWith({ type: 'place', cell: 0 });
  });
});

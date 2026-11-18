import { fireEvent, render, screen } from '@testing-library/react-native';

import { DIFFICULTY_BANDS } from '@/game-runtime/contracts';
import { makeDeps } from '@/game-runtime/__tests__/testGame';
import { startSession, submitAction } from '@/game-runtime/session';

import { snapshotMemoryUi } from '../board';
import { frameCells, pointsFor, SNAPSHOT_PROFILES, SNAPSHOT_TUTORIALS, snapshotMemory, specOf, sweep, type SnapshotState } from '../logic';

jest.setTimeout(120_000);

/** Watch, then place every item at truth + offset (offset 0 = perfect). */
function play(s0: SnapshotState, offset = 0): SnapshotState {
  let s = snapshotMemory.reduce(snapshotMemory.reduce(s0, { type: 'watch' }), { type: 'shown' });
  const n = specOf(s).size ** 2;
  const items = s.items;
  items.forEach((it, i) => {
    s = snapshotMemory.reduce(s, { type: 'select', item: i });
    if (s.selected !== i) s = snapshotMemory.reduce(s, { type: 'select', item: i });
    s = snapshotMemory.reduce(s, { type: 'place', cell: offset ? (n - 1 - it.cell) : it.cell });
  });
  return snapshotMemory.reduce(s, { type: 'check' });
}

describe('Snapshot Memory geometry', () => {
  it('the sweep covers every square and snakes between rows', () => {
    for (const [size, view] of [[4, 2], [5, 3], [6, 3], [6, 2]] as const) {
      const corners = sweep(size, view);
      expect(new Set(corners.flatMap((c) => frameCells(size, view, c))).size).toBe(size * size);
    }
    expect(sweep(4, 2)).toEqual([0, 2, 10, 8]);
  });

  it('scores exact 2, neighbours (diagonals too) 1, further 0', () => {
    expect(pointsFor(4, 5, 5)).toBe(2);
    expect(pointsFor(4, 5, 10)).toBe(1);
    expect(pointsFor(4, 5, 7)).toBe(0);
  });
});

describe('Snapshot Memory levels', () => {
  it.each(DIFFICULTY_BANDS)('%s: 200 seeds validate within the band', (band) => {
    for (let i = 0; i < 200; i += 1) {
      const level = snapshotMemory.createLevel(`p-${i}`, band);
      expect({ i, ok: snapshotMemory.validateLevel(level).valid }).toEqual({ i, ok: true });
      expect(level.initialState.rounds).toEqual(SNAPSHOT_PROFILES[band].rounds);
    }
    expect(snapshotMemory.createLevel('d', band)).toEqual(snapshotMemory.createLevel('d', band));
    expect(snapshotMemory.validateLevel(snapshotMemory.fallbackLevel(band)).valid).toBe(true);
  });

  it('tutorials validate; a poor map fails with a fresh room; perfect maps complete; scores', () => {
    for (const t of SNAPSHOT_TUTORIALS) expect(snapshotMemory.validateLevel(snapshotMemory.createLevel(t.id, t.difficulty)).valid).toBe(true);
    const s0 = snapshotMemory.createLevel('w', 'easy').initialState;
    const miss = play(s0, 1);
    expect(miss.lastResult?.passed).toBe(false);
    expect(miss.misses).toBe(1);
    const again = snapshotMemory.reduce(miss, { type: 'watch' });
    expect(again.items).not.toEqual(s0.items);
    let s = play(miss);
    expect(s.round).toBe(1);
    s = play(s);
    expect(snapshotMemory.isComplete(s)).toBe(true);
    expect(snapshotMemory.score(s, { moves: 0, hintsUsed: 0 })).toBe(135);
    expect(snapshotMemory.score(play(play(s0)), { moves: 0, hintsUsed: 0 })).toBe(150);
  });

  it('placing on an occupied square bumps the other object back to the tray; check needs all placed', () => {
    let s = snapshotMemory.reduce(snapshotMemory.reduce(snapshotMemory.createLevel('tutorial-2', 'easy').initialState, { type: 'watch' }), { type: 'shown' });
    expect(s.selected).toBe(0);
    s = snapshotMemory.reduce(s, { type: 'place', cell: 0 });
    expect(s.selected).toBe(1);
    s = snapshotMemory.reduce(s, { type: 'place', cell: 0 });
    expect(s.placed[0]).toBeNull();
    expect(s.placed[1]).toBe(0);
    expect(snapshotMemory.reduce(s, { type: 'check' })).toBe(s);
  });

  it('hints describe the area, then highlight squares', () => {
    let s = snapshotMemory.createLevel('tutorial-3', 'standard').initialState;
    s = snapshotMemory.reduce(snapshotMemory.reduce(s, { type: 'watch' }), { type: 'shown' });
    expect(snapshotMemory.hint!(s, 1).text).toMatch(/(top|bottom)-(left|right)/);
    expect(snapshotMemory.hint!(s, 3).highlightIds).toHaveLength(2);
  });

  it('plays through the runtime', () => {
    const deps = makeDeps();
    let { session } = startSession(snapshotMemory, { seed: 'rt', difficulty: 'expert' }, deps);
    while (session.status !== 'succeeded') {
      session = submitAction(snapshotMemory, session, { type: 'watch' }, deps).session;
      session = submitAction(snapshotMemory, session, { type: 'shown' }, deps).session;
      for (const it of session.state.items) session = submitAction(snapshotMemory, session, { type: 'place', cell: it.cell }, deps).session;
      session = submitAction(snapshotMemory, session, { type: 'check' }, deps).session;
    }
    expect(session.state.misses).toBe(0);
  });

  it('renders the sweep and the map', async () => {
    const onAction = jest.fn();
    const { Board } = snapshotMemoryUi;
    const s0 = snapshotMemory.createLevel('tutorial-1', 'intro').initialState;
    const view = await render(<Board state={s0} onAction={onAction} highlightIds={[]} disabled={false} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Watch' }));
    expect(onAction).toHaveBeenCalledWith({ type: 'watch' });
    await view.rerender(<Board state={snapshotMemory.reduce(s0, { type: 'watch' })} onAction={onAction} highlightIds={[]} disabled={false} />);
    expect(screen.getByText(/Snapshot 1 \//)).toBeTruthy();
    const placing = snapshotMemory.reduce(snapshotMemory.reduce(s0, { type: 'watch' }), { type: 'shown' });
    await view.rerender(<Board state={placing} onAction={onAction} highlightIds={[]} disabled={false} />);
    await fireEvent.press(screen.getAllByLabelText(/^Row 1, column 1/)[0]!);
    expect(onAction).toHaveBeenCalledWith({ type: 'place', cell: 0 });
  });
});

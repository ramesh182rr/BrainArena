import { fireEvent, render, screen } from '@testing-library/react-native';

import { DIFFICULTY_BANDS } from '@/game-runtime/contracts';
import { makeDeps } from '@/game-runtime/__tests__/testGame';
import { startSession, submitAction } from '@/game-runtime/session';

import { logicGridUi } from '../board';
import { brokenClues, clueStatus, clueText, GRID_PROFILES, GRID_TUTORIALS, holds, logicGrid, solveGrid, type GridState } from '../logic';

jest.setTimeout(240_000);

function fill(s0: GridState): GridState {
  let s = s0;
  for (let p = 0; p < s0.n; p += 1) {
    s = logicGrid.reduce(logicGrid.reduce(s, { type: 'select', p, col: 'item' }), { type: 'set', value: s0.solution.item[p]! });
    if (s0.useTimes) s = logicGrid.reduce(logicGrid.reduce(s, { type: 'select', p, col: 'time' }), { type: 'set', value: s0.solution.time[p]! });
  }
  return s;
}

describe('Logic Grid clues', () => {
  it('evaluates every clue kind on a full solution', () => {
    const sol = { item: [2, 0, 1], time: [1, 2, 0] };
    expect(holds({ k: 'has', p: 0, item: 2, yes: true }, sol)).toBe(true);
    expect(holds({ k: 'at', p: 1, time: 2, yes: false }, sol)).toBe(false);
    expect(holds({ k: 'itemAt', item: 1, time: 0, yes: true }, sol)).toBe(true);
    expect(holds({ k: 'before', a: { p: 2 }, b: { item: 2 } }, sol)).toBe(true);
    expect(holds({ k: 'next', a: { p: 0 }, b: { p: 1 } }, sol)).toBe(true);
    expect(clueText({ k: 'next', a: { item: 2 }, b: { p: 1 } })).toBe('Bo sets out right after the map carrier.');
  });

  it('decides clues live from partial entries', () => {
    const st = { item: [null, 0, null], time: [null, null, null] };
    expect(clueStatus({ k: 'has', p: 0, item: 0, yes: true }, st)).toBe(false);
    expect(clueStatus({ k: 'has', p: 0, item: 1, yes: true }, st)).toBeNull();
    expect(clueStatus({ k: 'before', a: { p: 0 }, b: { p: 1 } }, st)).toBeNull();
  });
});

describe('Logic Grid levels', () => {
  it.each(DIFFICULTY_BANDS)('%s: 200 seeds have exactly one answer', (band) => {
    const p = GRID_PROFILES[band];
    for (let i = 0; i < 200; i += 1) {
      const level = logicGrid.createLevel(`p-${i}`, band);
      expect({ i, ok: logicGrid.validateLevel(level).valid }).toEqual({ i, ok: true });
      expect(level.initialState.n).toBe(p.n);
      expect(level.initialState.clues.length).toBeGreaterThanOrEqual(p.minClues);
    }
    expect(logicGrid.createLevel('d', band)).toEqual(logicGrid.createLevel('d', band));
    expect(logicGrid.validateLevel(logicGrid.fallbackLevel(band)).valid).toBe(true);
  });

  it('tutorials validate; entries are exclusive; conflicts are detected; filling solves; scores', () => {
    for (const t of GRID_TUTORIALS) expect(logicGrid.validateLevel(logicGrid.createLevel(t.id, t.difficulty)).valid).toBe(true);
    const s0 = logicGrid.createLevel('tutorial-2', 'easy').initialState;
    expect(solveGrid(s0.n, s0.useTimes, s0.clues)).toHaveLength(1);
    let s = logicGrid.reduce(logicGrid.reduce(s0, { type: 'select', p: 0, col: 'item' }), { type: 'set', value: 1 });
    s = logicGrid.reduce(logicGrid.reduce(s, { type: 'select', p: 1, col: 'item' }), { type: 'set', value: 1 });
    expect(s.item[0]).toBeNull();
    expect(s.item[1]).toBe(1);
    // A full wrong grid breaks at least one clue.
    let wrong = s0;
    for (let p = 0; p < s0.n; p += 1) {
      wrong = logicGrid.reduce(logicGrid.reduce(wrong, { type: 'select', p, col: 'item' }), { type: 'set', value: (s0.solution.item[p]! + 1) % s0.n });
      wrong = logicGrid.reduce(logicGrid.reduce(wrong, { type: 'select', p, col: 'time' }), { type: 'set', value: (s0.solution.time[p]! + 1) % s0.n });
    }
    expect(brokenClues(wrong).length).toBeGreaterThan(0);
    expect(logicGrid.isComplete(wrong)).toBe(false);
    const done = fill(s0);
    expect(logicGrid.isComplete(done)).toBe(true);
    expect(brokenClues(done)).toEqual([]);
    expect(logicGrid.score(done, { moves: 0, hintsUsed: 0 })).toBe(150);
    expect(logicGrid.reduce(done, { type: 'reset' })).toBe(done);
  });

  it('hints point at a clue, then reveal cells; broken clues come first', () => {
    const s = logicGrid.createLevel('tutorial-3', 'advanced').initialState;
    expect(logicGrid.hint!(s, 3).highlightIds).toHaveLength(2);
    expect(logicGrid.hint!(s, 2).text).toMatch(/carries|sets out/);
  });

  it('plays through the runtime', () => {
    const deps = makeDeps();
    let { session } = startSession(logicGrid, { seed: 'rt', difficulty: 'expert' }, deps);
    const sol = session.state.solution;
    for (let p = 0; p < session.state.n; p += 1) {
      session = submitAction(logicGrid, session, { type: 'select', p, col: 'item' }, deps).session;
      session = submitAction(logicGrid, session, { type: 'set', value: sol.item[p]! }, deps).session;
      session = submitAction(logicGrid, session, { type: 'select', p, col: 'time' }, deps).session;
      session = submitAction(logicGrid, session, { type: 'set', value: sol.time[p]! }, deps).session;
    }
    expect(session.status).toBe('succeeded');
  });

  it('renders clues and the table', async () => {
    const onAction = jest.fn();
    const { Board } = logicGridUi;
    const s = logicGrid.reduce(logicGrid.createLevel('tutorial-1', 'intro').initialState, { type: 'select', p: 0, col: 'item' });
    await render(<Board state={s} onAction={onAction} highlightIds={[]} disabled={false} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Set lantern' }));
    expect(onAction).toHaveBeenCalledWith({ type: 'set', value: 0 });
    expect(screen.getAllByLabelText(/^Clue 1:/)).toHaveLength(1);
  });
});

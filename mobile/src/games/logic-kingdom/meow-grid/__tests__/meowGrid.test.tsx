import { fireEvent, render, screen } from '@testing-library/react-native';

import { DIFFICULTY_BANDS } from '@/game-runtime/contracts';
import { makeDeps } from '@/game-runtime/__tests__/testGame';
import { startSession, submitAction } from '@/game-runtime/session';

import { meowGridUi } from '../board';
import { conflicts, countSolutions, MEOW_PROFILES, MEOW_TUTORIALS, meowGrid, type MeowState } from '../logic';

function solve(s: MeowState): MeowState {
  return s.cells.reduce<MeowState>((x, v, i) => (v !== null ? x : meowGrid.reduce(meowGrid.reduce(x, { type: 'select', cell: i }), { type: 'place', cat: s.solution[i]! })), s);
}

jest.setTimeout(120_000);

describe('Meow Grid', () => {
  it.each(DIFFICULTY_BANDS)('%s: 200 seeds are unique-solution grids within the band', (band) => {
    const p = MEOW_PROFILES[band];
    for (let i = 0; i < 200; i += 1) {
      const level = meowGrid.createLevel(`p-${i}`, band);
      expect({ i, ok: meowGrid.validateLevel(level).valid }).toEqual({ i, ok: true });
      expect(level.initialState.size).toBe(p.size);
      expect(level.initialState.echoes).toHaveLength(p.echoes);
    }
    expect(meowGrid.createLevel('d', band)).toEqual(meowGrid.createLevel('d', band));
    expect(meowGrid.validateLevel(meowGrid.fallbackLevel(band)).valid).toBe(true);
  });

  it('tutorials are valid', () => {
    for (const t of MEOW_TUTORIALS) expect(meowGrid.validateLevel(meowGrid.createLevel(t.id, t.difficulty)).valid).toBe(true);
  });

  it('detects clashes and echo mismatches', () => {
    const s = meowGrid.createLevel('tutorial-3', 'advanced').initialState;
    const [x, y] = s.echoes[0]!;
    const cells = [...s.cells];
    cells[x] = 0;
    cells[y] = 1;
    expect(conflicts({ ...s, cells }).has(x)).toBe(true);
    expect(countSolutions(s, s.givens)).toBe(1);
  });

  it('selects, places, clears, undoes and completes', () => {
    const s0 = meowGrid.createLevel('tutorial-1', 'intro').initialState;
    const empty = s0.cells.findIndex((v) => v === null);
    const given = s0.cells.findIndex((v) => v !== null);
    expect(meowGrid.reduce(s0, { type: 'select', cell: given })).toBe(s0);
    let s = meowGrid.reduce(s0, { type: 'select', cell: empty });
    s = meowGrid.reduce(s, { type: 'place', cat: (s0.solution[empty]! + 1) % 4 });
    expect(s.wrongPlacements).toBe(1);
    s = meowGrid.reduce(s, { type: 'clear' });
    expect(s.cells[empty]).toBeNull();
    expect(meowGrid.reduce(s, { type: 'undo' }).cells[empty]).not.toBeNull();
    const done = solve(s0);
    expect(meowGrid.isComplete(done)).toBe(true);
    expect(meowGrid.score(done, { moves: 0, hintsUsed: 0 })).toBe(150);
  });

  it('hints find a forced square and flag wrong ones', () => {
    const s = meowGrid.createLevel('tutorial-1', 'intro').initialState;
    expect(meowGrid.hint!(s, 1).highlightIds).toHaveLength(1);
    expect(meowGrid.hint!(s, 2).text).toMatch(/fits the highlighted square/);
  });

  it('plays through the runtime', () => {
    const deps = makeDeps();
    let { session } = startSession(meowGrid, { seed: 'rt', difficulty: 'expert' }, deps);
    const sol = session.state.solution;
    session.state.cells.forEach((v, i) => {
      if (v !== null) return;
      session = submitAction(meowGrid, session, { type: 'select', cell: i }, deps).session;
      session = submitAction(meowGrid, session, { type: 'place', cat: sol[i]! }, deps).session;
    });
    expect(session.status).toBe('succeeded');
  });

  it('renders cells and the cat palette', async () => {
    const onAction = jest.fn();
    const s = meowGrid.createLevel('tutorial-1', 'intro').initialState;
    const { Board } = meowGridUi;
    await render(<Board state={{ ...s, selected: s.cells.findIndex((v) => v === null) }} onAction={onAction} highlightIds={[]} disabled={false} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Place Tabby' }));
    expect(onAction).toHaveBeenCalledWith({ type: 'place', cat: 0 });
  });
});

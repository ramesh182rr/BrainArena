import { fireEvent, render, screen } from '@testing-library/react-native';

import { DIFFICULTY_BANDS } from '@/game-runtime/contracts';
import { makeDeps } from '@/game-runtime/__tests__/testGame';
import { startSession, submitAction } from '@/game-runtime/session';

import { drawTheSolutionUi } from '../board';
import { canExtend, DRAW_PROFILES, DRAW_TUTORIALS, drawTheSolution, simulate, solveDraw, type Cell, type DrawState } from '../logic';

jest.setTimeout(300_000);

function solve(s0: DrawState): DrawState {
  const sol = solveDraw(s0)!;
  let s = drawTheSolution.reduce(s0, { type: 'material', material: sol.material });
  for (const cell of sol.stroke) s = drawTheSolution.reduce(s, { type: 'draw', cell });
  return drawTheSolution.reduce(s, { type: 'drop' });
}

describe('Draw the Solution physics', () => {
  // 4 wide, 3 high: ball at top-left heading right; floor only under columns 0-1; basket at bottom-right.
  const cells: Cell[] = ['air', 'air', 'air', 'air', 'air', 'anchor', 'air', 'air', 'wall', 'wall', 'air', 'basket'];
  const s = { width: 4, height: 3, cells, start: 0, startDir: 1 as const };
  it('falls, lands and rolls', () => {
    const run = simulate(s, [], 'plank');
    expect(run.path.slice(0, 2)).toEqual([0, 4]);
  });

  it('a plank bridges a gap; strokes start at an anchor', () => {
    expect(canExtend({ ...s, ink: 2 }, [], 6)).toBe(true);
    expect(canExtend({ ...s, ink: 2 }, [], 3)).toBe(false);
  });
});

describe('Draw the Solution levels', () => {
  it.each(DIFFICULTY_BANDS)('%s: 150 seeds validate with a proven minimum ink', (band) => {
    const p = DRAW_PROFILES[band];
    for (let i = 0; i < 150; i += 1) {
      const level = drawTheSolution.createLevel(`p-${i}`, band);
      expect({ i, ok: drawTheSolution.validateLevel(level).valid }).toEqual({ i, ok: true });
      expect(level.initialState.minInk).toBeGreaterThanOrEqual(p.minInk);
      expect(level.initialState.minInk).toBeLessThanOrEqual(p.ink);
    }
    expect(drawTheSolution.createLevel('d', band)).toEqual(drawTheSolution.createLevel('d', band));
    expect(drawTheSolution.validateLevel(drawTheSolution.fallbackLevel(band)).valid).toBe(true);
  });

  it('tutorials validate; drawing, erasing and dropping work; landing completes; scores', () => {
    for (const t of DRAW_TUTORIALS) expect(drawTheSolution.validateLevel(drawTheSolution.createLevel(t.id, t.difficulty)).valid).toBe(true);
    const s0 = drawTheSolution.createLevel('tutorial-1', 'intro').initialState;
    const miss = drawTheSolution.reduce(s0, { type: 'drop' });
    expect(miss.lastRun?.outcome).not.toBe('basket');
    const sol = solveDraw(s0)!;
    const one = drawTheSolution.reduce(s0, { type: 'draw', cell: sol.stroke[0]! });
    expect(one.stroke).toEqual([sol.stroke[0]]);
    expect(drawTheSolution.reduce(one, { type: 'draw', cell: sol.stroke[0]! }).stroke).toEqual([]);
    const done = solve(s0);
    expect(drawTheSolution.isComplete(done)).toBe(true);
    expect(drawTheSolution.score(done, { moves: 0, hintsUsed: 0 })).toBe(150);
  });

  it('hints give the ink needed, then squares', () => {
    const s = drawTheSolution.createLevel('tutorial-3', 'standard').initialState;
    expect(drawTheSolution.hint!(s, 1).text).toMatch(/square/);
    expect(drawTheSolution.hint!(s, 2).highlightIds).toHaveLength(1);
  });

  it('plays through the runtime', () => {
    const deps = makeDeps();
    let { session } = startSession(drawTheSolution, { seed: 'rt', difficulty: 'expert' }, deps);
    const sol = solveDraw(session.state)!;
    session = submitAction(drawTheSolution, session, { type: 'material', material: sol.material }, deps).session;
    for (const cell of sol.stroke) session = submitAction(drawTheSolution, session, { type: 'draw', cell }, deps).session;
    session = submitAction(drawTheSolution, session, { type: 'drop' }, deps).session;
    expect(session.status).toBe('succeeded');
  });

  it('renders the board and drops', async () => {
    const onAction = jest.fn();
    const { Board } = drawTheSolutionUi;
    const s = drawTheSolution.createLevel('tutorial-1', 'intro').initialState;
    await render(<Board state={s} onAction={onAction} highlightIds={[]} disabled={false} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Drop ball' }));
    expect(onAction).toHaveBeenCalledWith({ type: 'drop' });
    await fireEvent.press(screen.getAllByLabelText(/can draw here/)[0]!);
    expect(onAction).toHaveBeenCalledWith(expect.objectContaining({ type: 'draw' }));
  });
});

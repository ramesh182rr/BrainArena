import { fireEvent, render, screen } from '@testing-library/react-native';

import { DIFFICULTY_BANDS } from '@/game-runtime/contracts';
import { makeDeps } from '@/game-runtime/__tests__/testGame';
import { startSession, submitAction } from '@/game-runtime/session';

import { pathFinderUi } from '../board';
import { afterStep, GARDEN_PROFILES, GARDEN_TUTORIALS, pathFinder, solveGarden, type GardenState, type Ground } from '../logic';

jest.setTimeout(300_000);

const walk = (s0: GardenState) => solveGarden(s0, s0.ground, s0.start)!.reduce((s, cell) => pathFinder.reduce(s, { type: 'step', cell }), s0);

describe('Path Finder garden', () => {
  it('a step toggles neighbouring hedges; a flower toggles its row', () => {
    const g: Ground[] = ['grass', 'grass', 'hedgeUp', 'hedgeDown', 'flower', 'hedgeUp', 'grass', 'stone', 'grass'];
    const after = afterStep({ width: 3, height: 3 }, g, 1);
    expect(after[2]).toBe('hedgeDown');
    expect(after[4]).toBe('flower');
    const row = afterStep({ width: 3, height: 3 }, g, 4);
    expect([row[3], row[5]]).toEqual(['hedgeUp', 'hedgeDown']);
    expect(row[7]).toBe('stone');
  });
});

describe('Path Finder levels', () => {
  it.each(DIFFICULTY_BANDS)('%s: seeds validate with an exact par', (band) => {
    const p = GARDEN_PROFILES[band];
    for (let i = 0; i < 120; i += 1) {
      const level = pathFinder.createLevel(`p-${i}`, band);
      expect({ i, ok: pathFinder.validateLevel(level).valid }).toEqual({ i, ok: true });
      expect(level.initialState.par).toBeGreaterThanOrEqual(p.par[0]);
      expect(level.initialState.par).toBeLessThanOrEqual(p.par[1]);
    }
    expect(pathFinder.createLevel('d', band)).toEqual(pathFinder.createLevel('d', band));
    expect(pathFinder.validateLevel(pathFinder.fallbackLevel(band)).valid).toBe(true);
  });

  it('tutorials validate; blocked steps are ignored; undo/reset; reaching the fountain completes; scores', () => {
    for (const t of GARDEN_TUTORIALS) expect(pathFinder.validateLevel(pathFinder.createLevel(t.id, t.difficulty)).valid).toBe(true);
    const s0 = pathFinder.createLevel('tutorial-1', 'intro').initialState;
    expect(pathFinder.reduce(s0, { type: 'step', cell: s0.goal })).toBe(s0);
    const first = solveGarden(s0, s0.ground, s0.start)![0]!;
    const one = pathFinder.reduce(s0, { type: 'step', cell: first });
    expect(one.steps).toBe(1);
    expect(pathFinder.reduce(one, { type: 'undo' }).at).toBe(s0.start);
    expect(pathFinder.reduce(one, { type: 'reset' }).ground).toEqual(s0.initial);
    const done = walk(s0);
    expect(pathFinder.isComplete(done)).toBe(true);
    expect(pathFinder.score(done, { moves: 0, hintsUsed: 0 })).toBe(150);
  });

  it('hints give the distance, then the next squares', () => {
    const s = pathFinder.createLevel('tutorial-2', 'easy').initialState;
    expect(pathFinder.hint!(s, 1).text).toMatch(/steps? away/);
    expect(pathFinder.hint!(s, 3).highlightIds).toHaveLength(2);
  });

  it('plays through the runtime', () => {
    const deps = makeDeps();
    let { session } = startSession(pathFinder, { seed: 'rt', difficulty: 'expert' }, deps);
    for (const cell of solveGarden(session.state, session.state.ground, session.state.start)!) session = submitAction(pathFinder, session, { type: 'step', cell }, deps).session;
    expect(session.status).toBe('succeeded');
  });

  it('renders the garden and steps', async () => {
    const onAction = jest.fn();
    const { Board } = pathFinderUi;
    const s = pathFinder.createLevel('tutorial-1', 'intro').initialState;
    await render(<Board state={s} onAction={onAction} highlightIds={[]} disabled={false} />);
    const first = solveGarden(s, s.ground, s.start)![0]!;
    await fireEvent.press(screen.getByTestId(`plot-${first}`));
    expect(onAction).toHaveBeenCalledWith({ type: 'step', cell: first });
    expect(screen.getByLabelText(/you are here/)).toBeTruthy();
  });
});

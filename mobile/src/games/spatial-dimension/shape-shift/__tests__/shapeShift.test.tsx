import { fireEvent, render, screen } from '@testing-library/react-native';

import { DIFFICULTY_BANDS } from '@/game-runtime/contracts';
import { makeDeps } from '@/game-runtime/__tests__/testGame';
import { startSession, submitAction } from '@/game-runtime/session';

import { shapeShiftUi } from '../board';
import { currentCubes, frontShadow, normalise, rotate, ROTATIONS, SHAPE_PROFILES, SHAPE_TUTORIALS, shapeShift, solveShape, type Cube } from '../logic';

const L: Cube[] = [[0, 0, 0], [1, 0, 0], [0, 1, 0]];

describe('Shadow Tumble', () => {
  it('four of any rotation return the shape; there are 24 orientations', () => {
    for (const r of ROTATIONS) {
      let c = normalise(L);
      for (let i = 0; i < 4; i += 1) c = rotate(c, r);
      expect(c).toEqual(normalise(L));
    }
    const seen = new Set<string>();
    let frontier = [normalise([[0, 0, 0], [1, 0, 0], [2, 0, 0], [0, 1, 0], [0, 0, 1]])];
    while (frontier.length) {
      const next: Cube[][] = [];
      for (const c of frontier) for (const r of ROTATIONS) {
        const n = rotate(c, r);
        const k = JSON.stringify(n);
        if (!seen.has(k)) { seen.add(k); next.push(n); }
      }
      frontier = next;
    }
    expect(seen.size).toBe(24);
  });

  it('projects shadows', () => {
    expect(frontShadow(L)).toEqual(['0,0', '0,1', '1,0']);
  });

  it.each(DIFFICULTY_BANDS)('%s: 200 seeds validate within the band', (band) => {
    for (let i = 0; i < 200; i += 1) {
      const level = shapeShift.createLevel(`p-${i}`, band);
      expect({ i, ok: shapeShift.validateLevel(level).valid }).toEqual({ i, ok: true });
      expect(level.initialState.par).toBeLessThanOrEqual(SHAPE_PROFILES[band].par[1]);
      expect(level.initialState.targetSide !== null).toBe(SHAPE_PROFILES[band].side);
    }
    expect(shapeShift.createLevel('d', band)).toEqual(shapeShift.createLevel('d', band));
    expect(shapeShift.validateLevel(shapeShift.fallbackLevel(band)).valid).toBe(true);
  });

  it('tutorials validate; rotate, undo, complete, score, hints', () => {
    for (const t of SHAPE_TUTORIALS) expect(shapeShift.validateLevel(shapeShift.createLevel(t.id, t.difficulty)).valid).toBe(true);
    const s0 = shapeShift.createLevel('tutorial-2', 'standard').initialState;
    const path = solveShape(s0, s0.start)!;
    expect(shapeShift.hint!(s0, 2).highlightIds).toEqual([`rotate-${path[0]}`]);
    const one = shapeShift.reduce(s0, { type: 'rotate', rotation: 'turn' });
    expect(shapeShift.reduce(one, { type: 'undo' }).moves).toEqual([]);
    const done = path.reduce((x, r) => shapeShift.reduce(x, { type: 'rotate', rotation: r }), s0);
    expect(shapeShift.isComplete(done)).toBe(true);
    expect(currentCubes(done)).toHaveLength(s0.start.length);
    expect(shapeShift.score(done, { moves: 0, hintsUsed: 0 })).toBe(150);
  });

  it('plays through the runtime', () => {
    const deps = makeDeps();
    let { session } = startSession(shapeShift, { seed: 'rt', difficulty: 'expert' }, deps);
    for (const r of solveShape(session.state, session.state.start)!) session = submitAction(shapeShift, session, { type: 'rotate', rotation: r }, deps).session;
    expect(session.status).toBe('succeeded');
  });

  it('renders shadows and rotation buttons', async () => {
    const onAction = jest.fn();
    const { Board } = shapeShiftUi;
    await render(<Board state={shapeShift.createLevel('tutorial-1', 'intro').initialState} onAction={onAction} highlightIds={[]} disabled={false} />);
    expect(screen.getByLabelText(/^Target front\. row 1:/)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'tilt' }));
    expect(onAction).toHaveBeenCalledWith({ type: 'rotate', rotation: 'tilt' });
  });
});

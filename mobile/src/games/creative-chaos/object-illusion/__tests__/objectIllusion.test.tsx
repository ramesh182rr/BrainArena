import { fireEvent, render, screen } from '@testing-library/react-native';

import { DIFFICULTY_BANDS } from '@/game-runtime/contracts';
import { makeDeps } from '@/game-runtime/__tests__/testGame';
import { startSession, submitAction } from '@/game-runtime/session';

import { objectIllusionUi } from '../board';
import { applyChange, goalMet, ILLUSION_PROFILES, ILLUSION_TUTORIALS, objectIllusion, solveIllusion, type IllusionState } from '../logic';

jest.setTimeout(300_000);

const solve = (s0: IllusionState) => solveIllusion(s0.things0, s0.goals, s0.allowMove)!.reduce((s, change) => objectIllusion.reduce(s, { type: 'change', change }), s0);

describe('Object Illusion properties and goals', () => {
  const things = [
    { item: 0, weight: 2, warmth: 2, left: true },
    { item: 1, weight: 1, warmth: 0, left: false },
  ];
  it('changes one property by one step, within limits', () => {
    expect(applyChange(things, { k: 'weight', obj: 1, delta: 1 })![1]!.weight).toBe(2);
    expect(applyChange(things, { k: 'warmth', obj: 0, delta: 1 })).toBeNull();
    expect(applyChange(things, { k: 'move', obj: 0 })![0]!.left).toBe(false);
  });

  it('checks tilt, heat, counts and heaviest', () => {
    expect(goalMet({ k: 'tilt', side: 'left' }, things)).toBe(true);
    expect(goalMet({ k: 'noneHot', side: 'left' }, things)).toBe(false);
    expect(goalMet({ k: 'countWarmth', warmth: 0, count: 1 }, things)).toBe(true);
    expect(goalMet({ k: 'heaviest', item: 0 }, things)).toBe(true);
  });
});

describe('Object Illusion levels', () => {
  it.each(DIFFICULTY_BANDS)('%s: seeds validate with an exact par', (band) => {
    const p = ILLUSION_PROFILES[band];
    const count = band === 'expert' ? 80 : 200;
    for (let i = 0; i < count; i += 1) {
      const level = objectIllusion.createLevel(`p-${i}`, band);
      expect({ i, ok: objectIllusion.validateLevel(level).valid }).toEqual({ i, ok: true });
      expect(level.initialState.par).toBeGreaterThanOrEqual(p.par[0]);
      expect(level.initialState.par).toBeLessThanOrEqual(p.par[1]);
    }
    expect(objectIllusion.createLevel('d', band)).toEqual(objectIllusion.createLevel('d', band));
    expect(objectIllusion.validateLevel(objectIllusion.fallbackLevel(band)).valid).toBe(true);
  });

  it('tutorials validate; the budget holds; undo and reset; meeting goals completes; scores', () => {
    for (const t of ILLUSION_TUTORIALS) expect(objectIllusion.validateLevel(objectIllusion.createLevel(t.id, t.difficulty)).valid).toBe(true);
    const s0 = objectIllusion.createLevel('tutorial-2', 'easy').initialState;
    const first = solveIllusion(s0.things0, s0.goals, s0.allowMove)![0]!;
    const one = objectIllusion.reduce(s0, { type: 'change', change: first });
    expect(one.changes).toBe(1);
    expect(objectIllusion.reduce(one, { type: 'undo' }).things).toEqual(s0.things0);
    expect(objectIllusion.reduce(s0, { type: 'change', change: { k: 'move', obj: 0 } })).toBe(s0);
    const done = solve(s0);
    expect(objectIllusion.isComplete(done)).toBe(true);
    expect(objectIllusion.score(done, { moves: 0, hintsUsed: 0 })).toBe(150);
  });

  it('hints count goals, then point at an object', () => {
    const s = objectIllusion.createLevel('tutorial-3', 'advanced').initialState;
    expect(objectIllusion.hint!(s, 1).text).toMatch(/goal/);
    expect(objectIllusion.hint!(s, 2).highlightIds).toHaveLength(1);
  });

  it('plays through the runtime', () => {
    const deps = makeDeps();
    let { session } = startSession(objectIllusion, { seed: 'rt', difficulty: 'expert' }, deps);
    for (const change of solveIllusion(session.state.things0, session.state.goals, session.state.allowMove)!) session = submitAction(objectIllusion, session, { type: 'change', change }, deps).session;
    expect(session.status).toBe('succeeded');
  });

  it('renders goals, the scale and tools', async () => {
    const onAction = jest.fn();
    const { Board } = objectIllusionUi;
    const s = objectIllusion.createLevel('tutorial-1', 'intro').initialState;
    await render(<Board state={s} onAction={onAction} highlightIds={[]} disabled={false} />);
    await fireEvent.press(screen.getByTestId('thing-0'));
    const t = s.things[0]!;
    await fireEvent.press(screen.getByRole('button', { name: t.weight < 3 ? 'Heavier' : 'Lighter' }));
    expect(onAction).toHaveBeenCalledWith({ type: 'change', change: { k: 'weight', obj: 0, delta: t.weight < 3 ? 1 : -1 } });
  });
});

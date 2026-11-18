import { fireEvent, render, screen } from '@testing-library/react-native';

import { DIFFICULTY_BANDS } from '@/game-runtime/contracts';
import { makeDeps } from '@/game-runtime/__tests__/testGame';
import { startSession, submitAction } from '@/game-runtime/session';

import { dotConnectUi } from '../board';
import { canHop, DOT_PROFILES, DOT_TUTORIALS, dotConnect, solveConstellation, type ConstellationState } from '../logic';

jest.setTimeout(120_000);

function play(s0: ConstellationState): ConstellationState {
  const route = solveConstellation(s0, 1).first!;
  return route.slice(1).reduce((s, star) => dotConnect.reduce(s, { type: 'tap', star }), s0);
}

describe('Star Thread rules', () => {
  const s = { stars: [{ x: 0, y: 0, hue: 'gold' as const }, { x: 1, y: 0, hue: 'gold' as const }, { x: 0, y: 1, hue: 'aqua' as const }], links: [{ a: 0, b: 1, oneWay: false }, { a: 2, b: 0, oneWay: true }] };
  it('refuses unlinked, wrong-way and same-colour hops', () => {
    expect(canHop(s, 1, 2)).toBe('unlinked');
    expect(canHop(s, 0, 2)).toBe('oneway');
    expect(canHop(s, 2, 0)).toBe('ok');
    expect(canHop(s, 0, 1)).toBe('hue');
  });
});

describe('Star Thread levels', () => {
  it.each(DIFFICULTY_BANDS)('%s: 200 seeds are solvable within the band', (band) => {
    const p = DOT_PROFILES[band];
    for (let i = 0; i < 200; i += 1) {
      const level = dotConnect.createLevel(`p-${i}`, band);
      expect({ i, ok: dotConnect.validateLevel(level).valid }).toEqual({ i, ok: true });
      const s = level.initialState;
      expect(s.stars).toHaveLength(p.stars);
      expect(solveConstellation(s, p.maxSolutions + 1).count).toBeLessThanOrEqual(p.maxSolutions);
      expect(s.links.filter((l) => l.oneWay).length).toBeLessThanOrEqual(p.oneWay);
    }
    expect(dotConnect.createLevel('d', band)).toEqual(dotConnect.createLevel('d', band));
    expect(dotConnect.validateLevel(dotConnect.fallbackLevel(band)).valid).toBe(true);
  });

  it('tutorials validate; refusals explain; rewinding works; lighting all completes; scores', () => {
    for (const t of DOT_TUTORIALS) expect(dotConnect.validateLevel(dotConnect.createLevel(t.id, t.difficulty)).valid).toBe(true);
    const s0 = dotConnect.createLevel('tutorial-2', 'easy').initialState;
    const beacon = dotConnect.reduce(s0, { type: 'tap', star: s0.beacon });
    expect(beacon.lastRefusal).toMatch(/last star/);
    const route = solveConstellation(s0, 1).first!;
    let s = dotConnect.reduce(dotConnect.reduce(s0, { type: 'tap', star: route[1]! }), { type: 'tap', star: route[2]! });
    expect(s.route).toEqual(route.slice(0, 3));
    s = dotConnect.reduce(s, { type: 'tap', star: route[1]! });
    expect(s.route).toEqual(route.slice(0, 2));
    expect(s.backtracks).toBe(1);
    const done = play(s0);
    expect(dotConnect.isComplete(done)).toBe(true);
    expect(dotConnect.score(done, { moves: 0, hintsUsed: 0 })).toBe(150);
    expect(dotConnect.reduce(done, { type: 'undo' })).toBe(done);
  });

  it('hints point to the next stars, or to where the route went wrong', () => {
    const s0 = dotConnect.createLevel('tutorial-3', 'advanced').initialState;
    expect(dotConnect.hint!(s0, 3).highlightIds).toHaveLength(2);
  });

  it('plays through the runtime', () => {
    const deps = makeDeps();
    let { session } = startSession(dotConnect, { seed: 'rt', difficulty: 'expert' }, deps);
    for (const star of solveConstellation(session.state, 1).first!.slice(1)) session = submitAction(dotConnect, session, { type: 'tap', star }, deps).session;
    expect(session.status).toBe('succeeded');
  });

  it('renders stars and taps', async () => {
    const onAction = jest.fn();
    const { Board } = dotConnectUi;
    const s = dotConnect.createLevel('tutorial-1', 'intro').initialState;
    await render(<Board state={s} onAction={onAction} highlightIds={[]} disabled={false} />);
    await fireEvent.press(screen.getByTestId(`star-${s.beacon}`));
    expect(onAction).toHaveBeenCalledWith({ type: 'tap', star: s.beacon });
    expect(screen.getByLabelText(/^Start star/)).toBeTruthy();
  });
});

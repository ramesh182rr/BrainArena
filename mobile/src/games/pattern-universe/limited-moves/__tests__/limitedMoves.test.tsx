import { fireEvent, render, screen } from '@testing-library/react-native';

import { DIFFICULTY_BANDS } from '@/game-runtime/contracts';
import { makeDeps } from '@/game-runtime/__tests__/testGame';
import { startSession, submitAction } from '@/game-runtime/session';

import { limitedMovesUi } from '../board';
import { canStart, cheapest, energyLeft, limitedMoves, priceOf, WORKSHOP_PROFILES, WORKSHOP_TUTORIALS, type Machine, type WorkshopState } from '../logic';

jest.setTimeout(300_000);

const play = (s0: WorkshopState) => cheapest(s0)!.order.reduce((s, machine) => limitedMoves.reduce(s, { type: 'start', machine }), s0);

describe('Limited Moves economy', () => {
  const m = (kind: Machine['kind'], base: number, target = false): Machine => ({ kind, base, target, slot: 0 });
  const s = { machines: [m('gear', 1), m('plain', 3, true), m('boiler', 1), m('lock', 2, true)], links: [[0, 1], [2, 1], [3, 2]] as [number, number][] };
  it('gears lower and boilers raise linked prices; locks need a running neighbour', () => {
    expect(priceOf(s, new Set(), 1)).toBe(3);
    expect(priceOf(s, new Set([0]), 1)).toBe(2);
    expect(priceOf(s, new Set([0, 2]), 1)).toBe(3);
    expect(canStart(s, new Set(), 3)).toBe(false);
    expect(canStart(s, new Set([2]), 3)).toBe(true);
  });

  it('finds the cheapest order', () => {
    const best = cheapest(s)!;
    // gear 1 → plain 3-1 = 2 → boiler 1 → lock 2+1 (boiler running) = 3: total 7.
    expect(best.cost).toBe(7);
    expect(best.order.indexOf(0)).toBeLessThan(best.order.indexOf(1));
  });
});

describe('Limited Moves levels', () => {
  it.each(DIFFICULTY_BANDS)('%s: 200 seeds validate with an exact minimum', (band) => {
    const p = WORKSHOP_PROFILES[band];
    for (let i = 0; i < 200; i += 1) {
      const level = limitedMoves.createLevel(`p-${i}`, band);
      expect({ i, ok: limitedMoves.validateLevel(level).valid }).toEqual({ i, ok: true });
      expect(level.initialState.budget).toBe(level.initialState.minCost + p.slack);
    }
    expect(limitedMoves.createLevel('d', band)).toEqual(limitedMoves.createLevel('d', band));
    expect(limitedMoves.validateLevel(limitedMoves.fallbackLevel(band)).valid).toBe(true);
  });

  it('tutorials validate; prices and energy apply; undo refunds; finishing completes; scores', () => {
    for (const t of WORKSHOP_TUTORIALS) expect(limitedMoves.validateLevel(limitedMoves.createLevel(t.id, t.difficulty)).valid).toBe(true);
    const s0 = limitedMoves.createLevel('tutorial-2', 'easy').initialState;
    const first = cheapest(s0)!.order[0]!;
    const one = limitedMoves.reduce(s0, { type: 'start', machine: first });
    expect(one.spent).toBe(priceOf(s0, new Set(), first));
    expect(limitedMoves.reduce(one, { type: 'start', machine: first })).toBe(one);
    const back = limitedMoves.reduce(one, { type: 'undo' });
    expect(energyLeft(back)).toBe(s0.budget);
    const done = play(s0);
    expect(limitedMoves.isComplete(done)).toBe(true);
    expect(done.spent).toBeLessThanOrEqual(done.budget);
    expect(limitedMoves.score(done, { moves: 0, hintsUsed: 0 })).toBe(150);
  });

  it('hints suggest the next machines', () => {
    const s = limitedMoves.createLevel('tutorial-3', 'advanced').initialState;
    expect(limitedMoves.hint!(s, 2).highlightIds).toHaveLength(1);
  });

  it('plays through the runtime', () => {
    const deps = makeDeps();
    let { session } = startSession(limitedMoves, { seed: 'rt', difficulty: 'expert' }, deps);
    for (const machine of cheapest(session.state)!.order) session = submitAction(limitedMoves, session, { type: 'start', machine }, deps).session;
    expect(session.status).toBe('succeeded');
  });

  it('renders machines and the energy meter', async () => {
    const onAction = jest.fn();
    const { Board } = limitedMovesUi;
    const s = limitedMoves.createLevel('tutorial-1', 'intro').initialState;
    await render(<Board state={s} onAction={onAction} highlightIds={[]} disabled={false} />);
    expect(screen.getByLabelText(`Energy ${s.budget} of ${s.budget}`)).toBeTruthy();
    await fireEvent.press(screen.getByTestId('machine-0'));
    expect(onAction).toHaveBeenCalledWith({ type: 'start', machine: 0 });
  });
});

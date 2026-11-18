import { fireEvent, render, screen } from '@testing-library/react-native';

import { DIFFICULTY_BANDS } from '@/game-runtime/contracts';
import { makeDeps } from '@/game-runtime/__tests__/testGame';
import { startSession, submitAction } from '@/game-runtime/session';

import { chainReactionUi } from '../board';
import { CHAIN_PROFILES, CHAIN_TUTORIALS, chainReaction, simulate, solveChain, tapsBetween, type ChainNode, type ChainState } from '../logic';

jest.setTimeout(120_000);

const E: ChainNode = { t: 'empty' };
const board = (width: number, nodes: ChainNode[]) => ({ width, height: nodes.length / width, nodes });

function solve(s: ChainState): ChainState {
  const best = solveChain(s)!;
  let x = s;
  s.nodes.forEach((n, i) => {
    for (let k = 0; k < tapsBetween(n, s.initial[i]!, best.orient[i]!); k += 1) x = chainReaction.reduce(x, { type: 'rotate', cell: i });
  });
  return chainReaction.reduce(x, { type: 'fire' });
}

describe('Chain Reaction simulation', () => {
  it('relays re-fire one tick later, slow relays two', () => {
    // source → relay (pointing down) → star below it
    const nodes: ChainNode[] = [{ t: 'source', dir: 1 }, { t: 'relay', slow: false }, E, E, { t: 'star' }, E];
    const run = simulate(board(3, nodes), [0, 2, 0, 0, 0, 0]);
    expect(run.success).toBe(true);
    expect(run.trail.find((t) => t.cell === 4)?.tick).toBe(2);
    const slow = simulate(board(3, nodes.map((n) => (n.t === 'relay' ? { t: 'relay', slow: true } : n))), [0, 2, 0, 0, 0, 0]);
    expect(slow.trail.find((t) => t.cell === 4)?.tick).toBe(3);
  });

  it('splitters fire both ways along their axis', () => {
    const nodes: ChainNode[] = [{ t: 'star' }, { t: 'split' }, { t: 'star' }, E, { t: 'source', dir: 0 }, E];
    expect(simulate(board(3, nodes), [0, 1, 0, 0, 0, 0]).success).toBe(true);
    expect(simulate(board(3, nodes), [0, 0, 0, 0, 0, 0]).success).toBe(false);
  });

  it('a twin lock fires only when two pulses arrive in the same tick', () => {
    const state = chainReaction.createLevel('tutorial-3', 'advanced').initialState;
    const best = solveChain(state)!;
    const twin = state.nodes.findIndex((n) => n.t === 'twin');
    expect(simulate(state, best.orient).fired).toContain(twin);
    // A single pulse reaching the twin does nothing.
    const lone: ChainNode[] = [{ t: 'source', dir: 1 }, { t: 'twin', dir: 1 }, { t: 'star' }];
    expect(simulate(board(3, lone), [0, 0, 0]).success).toBe(false);
  });
});

describe('Chain Reaction levels', () => {
  it.each(DIFFICULTY_BANDS)('%s: 200 seeds validate within the band', (band) => {
    const p = CHAIN_PROFILES[band];
    for (let i = 0; i < 200; i += 1) {
      const level = chainReaction.createLevel(`p-${i}`, band);
      expect({ i, ok: chainReaction.validateLevel(level).valid }).toEqual({ i, ok: true });
      expect(level.initialState.par).toBeLessThanOrEqual(p.par[1]);
      expect(level.initialState.nodes.some((n) => n.t === 'twin')).toBe(p.twin);
    }
    expect(chainReaction.createLevel('d', band)).toEqual(chainReaction.createLevel('d', band));
    expect(chainReaction.validateLevel(chainReaction.fallbackLevel(band)).valid).toBe(true);
  });

  it('tutorials validate; turns respect the budget; firing completes; scores', () => {
    for (const t of CHAIN_TUTORIALS) expect(chainReaction.validateLevel(chainReaction.createLevel(t.id, t.difficulty)).valid).toBe(true);
    const s0 = chainReaction.createLevel('tutorial-1', 'intro').initialState;
    const miss = chainReaction.reduce(s0, { type: 'fire' });
    expect(miss.lastRun?.success).toBe(false);
    expect(miss.fires).toBe(1);
    const relay = s0.nodes.findIndex((n) => n.t === 'relay');
    let spent = s0;
    for (let i = 0; i < s0.budget + 3; i += 1) spent = chainReaction.reduce(spent, { type: 'rotate', cell: relay });
    expect(spent.rotations).toBe(s0.budget);
    expect(chainReaction.reduce(spent, { type: 'reset' }).rotations).toBe(0);
    const done = solve(s0);
    expect(chainReaction.isComplete(done)).toBe(true);
    expect(chainReaction.score(done, { moves: 0, hintsUsed: 0 })).toBe(150);
  });

  it('hints point at nodes to turn', () => {
    const s = chainReaction.createLevel('tutorial-2', 'standard').initialState;
    expect(chainReaction.hint!(s, 1).text).toMatch(/need/);
    expect(chainReaction.hint!(s, 2).highlightIds).toHaveLength(1);
  });

  it('plays through the runtime', () => {
    const deps = makeDeps();
    let { session } = startSession(chainReaction, { seed: 'rt', difficulty: 'expert' }, deps);
    const s = session.state;
    const best = solveChain(s)!;
    s.nodes.forEach((n, i) => {
      for (let k = 0; k < tapsBetween(n, s.initial[i]!, best.orient[i]!); k += 1) session = submitAction(chainReaction, session, { type: 'rotate', cell: i }, deps).session;
    });
    session = submitAction(chainReaction, session, { type: 'fire' }, deps).session;
    expect(session.status).toBe('succeeded');
  });

  it('renders nodes and fires', async () => {
    const onAction = jest.fn();
    const { Board } = chainReactionUi;
    await render(<Board state={chainReaction.createLevel('tutorial-1', 'intro').initialState} onAction={onAction} highlightIds={[]} disabled={false} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Fire' }));
    expect(onAction).toHaveBeenCalledWith({ type: 'fire' });
    expect(screen.getAllByLabelText(/Relay pointing .* Tap to turn\./).length).toBeGreaterThan(0);
  });
});

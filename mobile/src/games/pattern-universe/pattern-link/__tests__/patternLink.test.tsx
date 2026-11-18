import { fireEvent, render, screen } from '@testing-library/react-native';

import { DIFFICULTY_BANDS } from '@/game-runtime/contracts';
import { makeDeps } from '@/game-runtime/__tests__/testGame';
import { startSession, submitAction } from '@/game-runtime/session';

import { patternLinkUi } from '../board';
import { allowed, patternLink, solveWeave, WEAVE_PROFILES, WEAVE_TUTORIALS, type WeaveState } from '../logic';

jest.setTimeout(240_000);

function walk(s0: WeaveState): WeaveState {
  return solveWeave(s0)!.slice(1).reduce((s, cell) => patternLink.reduce(s, { type: 'step', cell }), s0);
}

describe('Pattern Link grammar', () => {
  it('alternating grammars switch rule by step parity', () => {
    const g = { next: [[[1], [0]], [[0], [1]]] };
    expect(allowed(g, 0, 0, 1)).toBe(true);
    expect(allowed(g, 1, 0, 1)).toBe(false);
    expect(allowed(g, 1, 0, 0)).toBe(true);
  });
});

describe('Pattern Link levels', () => {
  it.each(DIFFICULTY_BANDS)('%s: 200 seeds validate within the band', (band) => {
    const p = WEAVE_PROFILES[band];
    for (let i = 0; i < 200; i += 1) {
      const level = patternLink.createLevel(`p-${i}`, band);
      expect({ i, ok: patternLink.validateLevel(level).valid }).toEqual({ i, ok: true });
      expect(level.initialState.par).toBeGreaterThanOrEqual(p.par[0]);
      expect(level.initialState.par).toBeLessThanOrEqual(p.par[1]);
      expect(level.initialState.grammar.next).toHaveLength(p.rules);
    }
    expect(patternLink.createLevel('d', band)).toEqual(patternLink.createLevel('d', band));
    expect(patternLink.validateLevel(patternLink.fallbackLevel(band)).valid).toBe(true);
  });

  it('tutorials validate; refused steps explain; undo works; reaching the goal completes; scores', () => {
    for (const t of WEAVE_TUTORIALS) expect(patternLink.validateLevel(patternLink.createLevel(t.id, t.difficulty)).valid).toBe(true);
    const s0 = patternLink.createLevel('tutorial-2', 'easy').initialState;
    const far = patternLink.reduce(s0, { type: 'step', cell: s0.goal });
    expect(far.lastRefusal).toMatch(/next to/);
    expect(far.refusals).toBe(0);
    const route = solveWeave(s0)!;
    const one = patternLink.reduce(s0, { type: 'step', cell: route[1]! });
    expect(one.path).toEqual(route.slice(0, 2));
    expect(patternLink.reduce(one, { type: 'undo' }).path).toEqual([s0.start]);
    const done = walk(s0);
    expect(patternLink.isComplete(done)).toBe(true);
    expect(patternLink.score(done, { moves: 0, hintsUsed: 0 })).toBe(150);
  });

  it('a step the grammar forbids is refused and counted', () => {
    const s0 = patternLink.createLevel('tutorial-1', 'intro').initialState;
    const w = s0.width;
    const at = s0.start;
    const neighbours = [at - w, at + 1, at + w, at - 1].filter((n) => n >= 0 && n < s0.motifs.length && !(at % w === 0 && n === at - 1));
    const bad = neighbours.find((n) => !allowed(s0.grammar, 0, s0.motifs[at]!, s0.motifs[n]!));
    if (bad === undefined) return;
    const s = patternLink.reduce(s0, { type: 'step', cell: bad });
    expect(s.refusals).toBe(1);
    expect(s.lastRefusal).toMatch(/can't follow/);
  });

  it('hints read an example, then point the way', () => {
    const s = patternLink.createLevel('tutorial-3', 'advanced').initialState;
    expect(patternLink.hint!(s, 1).text).toMatch(/followed by/);
    expect(patternLink.hint!(s, 3).highlightIds).toHaveLength(2);
  });

  it('plays through the runtime', () => {
    const deps = makeDeps();
    let { session } = startSession(patternLink, { seed: 'rt', difficulty: 'expert' }, deps);
    for (const cell of solveWeave(session.state)!.slice(1)) session = submitAction(patternLink, session, { type: 'step', cell }, deps).session;
    expect(session.status).toBe('succeeded');
  });

  it('renders the rule card and tiles', async () => {
    const onAction = jest.fn();
    const { Board } = patternLinkUi;
    const s = patternLink.createLevel('tutorial-1', 'intro').initialState;
    await render(<Board state={s} onAction={onAction} highlightIds={[]} disabled={false} />);
    expect(screen.getByText('Rule card')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('tile-1'));
    expect(onAction).toHaveBeenCalledWith({ type: 'step', cell: 1 });
  });
});

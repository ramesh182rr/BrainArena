import { fireEvent, render, screen } from '@testing-library/react-native';

import { DIFFICULTY_BANDS } from '@/game-runtime/contracts';
import { makeDeps } from '@/game-runtime/__tests__/testGame';
import { startSession, submitAction } from '@/game-runtime/session';

import { blockEscapeUi } from '../board';
import { blockEscape, ESCAPE_PROFILES, ESCAPE_TUTORIALS, solveEscape, tryMove, type EscapeState, type Tile } from '../logic';

jest.setTimeout(600_000);

function solve(s0: EscapeState): EscapeState {
  let s = s0;
  for (const m of solveEscape(s0, s0)!) {
    s = blockEscape.reduce(s, { type: 'select', piece: m.piece });
    s = blockEscape.reduce(s, { type: 'move', dir: m.dir });
  }
  return s;
}

describe('Pallet Ferry rules', () => {
  // 4×1: crate | pit | pit-with-platform? Use 4 wide, 1 high: floor, pit, floor, dock.
  const tiles: Tile[] = ['floor', 'pit', 'floor', 'dock'];
  const board = { width: 4, height: 1, tiles };
  it('crates cannot step into an uncovered pit, but can step onto a platform over it', () => {
    expect(tryMove(board, { platforms: [], crates: [0] }, { kind: 'crate', index: 0 }, 1)).toBeNull();
    expect(tryMove(board, { platforms: [{ at: 1, w: 1, h: 1 }], crates: [0] }, { kind: 'crate', index: 0 }, 1)?.crates).toEqual([1]);
  });

  it('platforms carry riding crates and are blocked by floor crates', () => {
    const riding = tryMove(board, { platforms: [{ at: 1, w: 1, h: 1 }], crates: [1] }, { kind: 'platform', index: 0 }, 1);
    expect(riding).toEqual({ platforms: [{ at: 2, w: 1, h: 1 }], crates: [2] });
    expect(tryMove(board, { platforms: [{ at: 1, w: 1, h: 1 }], crates: [3, 2] }, { kind: 'platform', index: 0 }, 1)).toBeNull();
  });
});

describe('Pallet Ferry levels', () => {
  it.each(DIFFICULTY_BANDS)('%s: seeds validate with an exact par in the band', (band) => {
    const p = ESCAPE_PROFILES[band];
    const count = band === 'advanced' || band === 'expert' ? 30 : 150;
    for (let i = 0; i < count; i += 1) {
      const level = blockEscape.createLevel(`p-${i}`, band);
      expect({ i, ok: blockEscape.validateLevel(level).valid }).toEqual({ i, ok: true });
      expect(level.initialState.par).toBeGreaterThanOrEqual(p.par[0]);
      expect(level.initialState.par).toBeLessThanOrEqual(p.par[1]);
    }
    expect(blockEscape.createLevel('d', band)).toEqual(blockEscape.createLevel('d', band));
    expect(blockEscape.validateLevel(blockEscape.fallbackLevel(band)).valid).toBe(true);
  });

  it('tutorials validate; moves, undo and reset work; docking completes; scores', () => {
    for (const t of ESCAPE_TUTORIALS) expect(blockEscape.validateLevel(blockEscape.createLevel(t.id, t.difficulty)).valid).toBe(true);
    const s0 = blockEscape.createLevel('tutorial-1', 'intro').initialState;
    expect(blockEscape.reduce(s0, { type: 'move', dir: 1 })).toBe(s0);
    const first = solveEscape(s0, s0)![0]!;
    const moved = blockEscape.reduce(blockEscape.reduce(s0, { type: 'select', piece: first.piece }), { type: 'move', dir: first.dir });
    expect(moved.moves).toBe(1);
    expect(blockEscape.reduce(moved, { type: 'undo' }).crates).toEqual(s0.crates);
    expect(blockEscape.reduce(moved, { type: 'reset' }).platforms).toEqual(s0.platforms);
    const done = solve(s0);
    expect(blockEscape.isComplete(done)).toBe(true);
    expect(blockEscape.score(done, { moves: 0, hintsUsed: 0 })).toBe(150);
  });

  it('hints give the distance, then the next moves', () => {
    const s = blockEscape.createLevel('tutorial-2', 'easy').initialState;
    expect(blockEscape.hint!(s, 1).text).toMatch(/moves? away/);
    expect(blockEscape.hint!(s, 3).highlightIds.length).toBeGreaterThanOrEqual(1);
  });

  it('plays through the runtime', () => {
    const deps = makeDeps();
    let { session } = startSession(blockEscape, { seed: 'rt', difficulty: 'standard' }, deps);
    for (const m of solveEscape(session.state, session.state)!) {
      session = submitAction(blockEscape, session, { type: 'select', piece: m.piece }, deps).session;
      session = submitAction(blockEscape, session, { type: 'move', dir: m.dir }, deps).session;
    }
    expect(session.status).toBe('succeeded');
  });

  it('renders the warehouse and moves the selection', async () => {
    const onAction = jest.fn();
    const { Board } = blockEscapeUi;
    const s = blockEscape.reduce(blockEscape.createLevel('tutorial-1', 'intro').initialState, { type: 'select', piece: { kind: 'crate', index: 0 } });
    await render(<Board state={s} onAction={onAction} highlightIds={[]} disabled={false} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Move Right' }));
    expect(onAction).toHaveBeenCalledWith({ type: 'move', dir: 1 });
    await fireEvent.press(screen.getByLabelText(/gold crate$/));
    expect(onAction).toHaveBeenCalledWith(expect.objectContaining({ type: 'select' }));
  });
});

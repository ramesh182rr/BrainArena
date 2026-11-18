import { fireEvent, render, screen } from '@testing-library/react-native';

import { DIFFICULTY_BANDS } from '@/game-runtime/contracts';
import { makeDeps } from '@/game-runtime/__tests__/testGame';
import { startSession, submitAction } from '@/game-runtime/session';

import { gravityLabUi } from '../board';
import { GRAVITY_TUTORIALS, gravityLab, LAB_PROFILES, simulate, solveLab, type DeviceKind, type GravityState, type LabCell } from '../logic';

jest.setTimeout(240_000);

const E: LabCell = { t: 'empty' };
function lab(width: number, cells: LabCell[], start: number, startDir: 0 | 1 | 2 | 3, placed: Record<number, DeviceKind> = {}) {
  return { width, height: cells.length / width, cells, start, startDir, placed: cells.map((_, i) => placed[i] ?? null) };
}

/** Place the solver's devices with cycle taps, then launch. */
function solve(s: GravityState): GravityState {
  const sol = solveLab(s)!;
  const order = [...new Set(s.inventory)];
  let x = s;
  sol.forEach((k, i) => {
    if (!k) return;
    for (let t = 0; t <= order.indexOf(k); t += 1) x = gravityLab.reduce(x, { type: 'cycle', cell: i });
  });
  return gravityLab.reduce(x, { type: 'launch' });
}

describe('Gravity Lab physics', () => {
  // 5 wide: orb starts at 10 (row 2, col 0) heading right.
  const cells = (): LabCell[] => Array.from({ length: 25 }, () => E);
  it('drifts straight and drops off the edge without devices', () => {
    const run = simulate(lab(5, cells(), 10, 1));
    expect(run.path).toEqual([10, 11, 12, 13, 14]);
    expect(run.outcome).toBe('lost');
  });

  it('an attractor swings the orb round its corner, once', () => {
    // Attractor at 16 (row 3, col 1): passing it at 12 the orb turns down.
    const run = simulate(lab(5, cells(), 10, 1, { 16: 'attract' }));
    expect(run.path.slice(0, 4)).toEqual([10, 11, 12, 17]);
    expect(run.path).toContain(22);
  });

  it('a repulsor turns the orb away as it nears the corner', () => {
    // Repulsor at 17 (row 3, col 2): at 11 it is diagonally ahead-below, so the orb turns up.
    const run = simulate(lab(5, cells(), 10, 1, { 17: 'repel' }));
    expect(run.path.slice(0, 3)).toEqual([10, 11, 6]);
  });

  it('disagreeing devices cancel out; walls stop the orb', () => {
    const run = simulate(lab(5, cells(), 10, 1, { 16: 'attract', 6: 'attract' }));
    expect(run.path.slice(0, 4)).toEqual([10, 11, 12, 13]);
    const walled = cells();
    walled[13] = { t: 'wall' };
    expect(simulate(lab(5, walled, 10, 1)).outcome).toBe('crash');
  });

  it('the exit only counts after every gate', () => {
    const c = cells();
    c[12] = { t: 'exit' };
    c[17] = { t: 'gate', n: 1 };
    expect(simulate(lab(5, c, 10, 1)).outcome).toBe('lost');
    c[17] = E;
    expect(simulate(lab(5, c, 10, 1)).outcome).toBe('exit');
  });
});

describe('Gravity Lab levels', () => {
  it.each(DIFFICULTY_BANDS)('%s: 200 seeds validate within the band', (band) => {
    const p = LAB_PROFILES[band];
    for (let i = 0; i < 200; i += 1) {
      const level = gravityLab.createLevel(`p-${i}`, band);
      expect({ i, ok: gravityLab.validateLevel(level).valid }).toEqual({ i, ok: true });
      const s = level.initialState;
      expect(s.width).toBe(p.size);
      expect(s.cells.filter((c) => c.t === 'gate')).toHaveLength(p.gates);
    }
    expect(gravityLab.createLevel('d', band)).toEqual(gravityLab.createLevel('d', band));
    expect(gravityLab.validateLevel(gravityLab.fallbackLevel(band)).valid).toBe(true);
  });

  it('tutorials validate; placing cycles stock; launching completes; scores', () => {
    for (const t of GRAVITY_TUTORIALS) expect(gravityLab.validateLevel(gravityLab.createLevel(t.id, t.difficulty)).valid).toBe(true);
    const s0 = gravityLab.createLevel('tutorial-2', 'easy').initialState;
    const miss = gravityLab.reduce(s0, { type: 'launch' });
    expect(miss.lastRun?.outcome).not.toBe('exit');
    expect(miss.launches).toBe(1);
    const spot = s0.cells.findIndex((c, i) => c.t === 'empty' && i !== s0.start);
    const a = gravityLab.reduce(s0, { type: 'cycle', cell: spot });
    expect(a.placed[spot]).toBe('attract');
    expect(gravityLab.reduce(a, { type: 'cycle', cell: spot }).placed[spot]).toBe('repel');
    expect(gravityLab.reduce(gravityLab.reduce(a, { type: 'cycle', cell: spot }), { type: 'cycle', cell: spot }).placed[spot]).toBeNull();
    expect(gravityLab.reduce(a, { type: 'cycle', cell: s0.start })).toBe(a);
    expect(gravityLab.reduce(a, { type: 'clear' }).placed.some(Boolean)).toBe(false);
    const done = solve(s0);
    expect(gravityLab.isComplete(done)).toBe(true);
    expect(gravityLab.score(done, { moves: 0, hintsUsed: 0 })).toBe(150);
    expect(gravityLab.reduce(done, { type: 'clear' })).toBe(done);
  });

  it('hints name and then show device squares', () => {
    const s = gravityLab.createLevel('tutorial-2', 'easy').initialState;
    expect(gravityLab.hint!(s, 1).text).toMatch(/device/);
    expect(gravityLab.hint!(s, 2).highlightIds).toHaveLength(1);
  });

  it('plays through the runtime', () => {
    const deps = makeDeps();
    let { session } = startSession(gravityLab, { seed: 'rt', difficulty: 'expert' }, deps);
    const s = session.state;
    const sol = solveLab(s)!;
    const order = [...new Set(s.inventory)];
    sol.forEach((k, i) => {
      if (!k) return;
      for (let t = 0; t <= order.indexOf(k); t += 1) session = submitAction(gravityLab, session, { type: 'cycle', cell: i }, deps).session;
    });
    session = submitAction(gravityLab, session, { type: 'launch' }, deps).session;
    expect(session.status).toBe('succeeded');
  });

  it('renders squares and launches', async () => {
    const onAction = jest.fn();
    const { Board } = gravityLabUi;
    await render(<Board state={gravityLab.createLevel('tutorial-1', 'intro').initialState} onAction={onAction} highlightIds={[]} disabled={false} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Launch' }));
    expect(onAction).toHaveBeenCalledWith({ type: 'launch' });
    await fireEvent.press(screen.getAllByLabelText(/Empty\. Tap to place/)[0]!);
    expect(onAction).toHaveBeenCalledWith(expect.objectContaining({ type: 'cycle' }));
  });
});

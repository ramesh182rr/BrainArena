import { simulate } from '../simulate';
import { applyAll, at, boardState, solvingActions } from './helpers';

describe('simulate', () => {
  it('delivers a pulse along an aligned route', () => {
    const result = simulate(boardState(['EsE S1 S1 Rs']));
    expect(result.solved).toBe(true);
    expect(result.traces).toHaveLength(1);
    expect(result.traces[0]).toMatchObject({ kind: 'spark', outcome: 'delivered' });
    expect(result.traces[0]!.steps.map((s) => s.index)).toEqual([1, 2, 3]);
  });

  it('reports a pulse blocked by a misaligned conduit', () => {
    const result = simulate(boardState(['EsE S0 S1 Rs']));
    expect(result.solved).toBe(false);
    expect(result.traces[0]).toMatchObject({ outcome: 'blocked' });
    expect(result.traces[0]!.steps.map((s) => s.index)).toEqual([1]);
  });

  it('reports pulses that leave the board', () => {
    const result = simulate(boardState(['EsE S1', 'Rs  ..']));
    expect(result.traces[0]).toMatchObject({ outcome: 'escaped' });
    expect(result.traces[0]!.steps.map((s) => s.index)).toEqual([1]);
  });

  it('reports pulses that hit an empty cell or an emitter', () => {
    expect(simulate(boardState(['EsE .. Rs'])).traces[0]?.outcome).toBe('blocked');
    expect(simulate(boardState(['EsE EwW', 'Rs  Rw'])).traces.map((t) => t.outcome)).toEqual(['blocked', 'blocked']);
  });

  it('reports a pulse that reaches the wrong kind of receiver', () => {
    const result = simulate(boardState(['EsE S1 Rw']));
    expect(result.traces[0]).toMatchObject({ outcome: 'wrong_receiver' });
    expect(result.solved).toBe(false);
  });

  it('lets matching pulses through gates and absorbs the rest', () => {
    expect(simulate(boardState(['EsE Gs1 Rs'])).solved).toBe(true);
    const blocked = simulate(boardState(['EwE Gs1 Rw']));
    expect(blocked.traces[0]).toMatchObject({ outcome: 'absorbed' });
    // A gate side that is closed blocks rather than absorbs.
    expect(simulate(boardState(['EwE Gs0 Rw'])).traces[0]?.outcome).toBe('blocked');
  });

  // No 'looped' test: every conduit pairs its sides one-to-one, so a pulse's path can
  // always be traced back to its emitter and can never cycle. simulate() keeps a guard anyway.

  it('overloads conduits that two pulses cross in opposite directions', () => {
    // With reversible conduits, opposite directions are the only way two pulses can share one.
    const result = simulate(boardState(['EsE S1 S1 EwW', 'Rs  .. .. Rw']));
    expect(result.overloadedCells).toEqual([at(4, 0, 1), at(4, 0, 2)]);
    expect(result.solved).toBe(false);
  });

  it('lets perpendicular pulses share a crossing but not parallel ones', () => {
    const ok = simulate(boardState(['..  EwS ..', 'EsE X   Rs', '..  Rw  ..']));
    expect(ok.solved).toBe(true);
    expect(ok.overloadedCells).toEqual([]);

    const parallel = simulate(boardState(['EsE X  S1 Rs', '..  .. .. ..', 'EwE S1 X  Rw']));
    expect(parallel.solved).toBe(true);
  });

  it('overloads a receiver that two pulses reach', () => {
    const rows = ['EsE Rs  EsW'];
    const result = simulate(boardState(rows));
    expect(result.overloadedCells).toEqual([1]);
    expect(result.solved).toBe(false);
  });

  it('is unsolved when a receiver gets nothing, even if every pulse lands', () => {
    expect(simulate(boardState(['EsE Rs Rs'])).solved).toBe(false);
  });

  it('is deterministic', () => {
    const state = boardState(['EsE S0 S1 B0', '..  .. .. S1', '..  .. Rs B3']);
    expect(simulate(state)).toEqual(simulate(state));
    const solved = applyAll(state, solvingActions(state));
    expect(simulate(solved).solved).toBe(true);
  });
});

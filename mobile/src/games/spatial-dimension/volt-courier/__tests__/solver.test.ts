import { DIFFICULTY_BANDS } from '@/game-runtime/contracts';

import { FALLBACK_LEVELS, TUTORIAL_LEVELS, parseBoard } from '../authored';
import { isRotatable, turnsBetween } from '../grid';
import { voltCourier } from '../module';
import { simulate } from '../simulate';
import { solve } from '../solver';
import type { VoltCourierState, Cell } from '../types';
import { boardState } from './helpers';

/** Tries every rotation of every rotatable cell; only feasible for small boards. */
function bruteForceCost(board: VoltCourierState): number | null {
  const free = board.cells.flatMap((c, i) => (isRotatable(c) ? [i] : []));
  if (free.length > 9) throw new Error('board too large for brute force');
  let best: number | null = null;
  for (let combo = 0; combo < 4 ** free.length; combo += 1) {
    const rotations = [...board.rotations];
    let cost = 0;
    free.forEach((index, k) => {
      const r = Math.floor(combo / 4 ** k) % 4;
      rotations[index] = r;
      cost += turnsBetween(board.cells[index] as Cell, board.rotations[index] ?? 0, r);
    });
    if ((best === null || cost < best) && simulate({ ...board, rotations }).solved) best = cost;
  }
  return best;
}

describe('solve', () => {
  it('finds the minimum-turn solution and it actually solves the board', () => {
    const state = boardState(['EsE S0 S1 B0', '..  .. .. S1', '..  .. Rs B3']);
    const result = solve(state);
    expect(result).toMatchObject({ status: 'solved', cost: 4 });
    if (result.status !== 'solved') return;
    expect(simulate({ ...state, rotations: result.rotations }).solved).toBe(true);
  });

  it('costs nothing on an already solved board', () => {
    expect(solve(boardState(['EsE S1 Rs']))).toMatchObject({ status: 'solved', cost: 0 });
  });

  it('matches a brute-force search on small boards (optimality)', () => {
    const boards = [
      ...Array.from({ length: 25 }, (_, i) => voltCourier.createLevel(`brute-${i}`, 'intro').initialState),
      boardState(TUTORIAL_LEVELS[0]!.rows),
      boardState(FALLBACK_LEVELS.intro.rows),
      // Two routes around a block: over the top costs 7 turns, underneath costs 5.
      boardState(['..  B0  S0  B0  ..', 'EsE B0  ..  B0  Rs', '..  B0  S0  B2  ..']),
    ];
    for (const board of boards) {
      const expected = bruteForceCost(board);
      expect(expected).not.toBeNull();
      expect(solve(board)).toMatchObject({ status: 'solved', cost: expected });
    }
    expect(bruteForceCost(boards[boards.length - 1]!)).toBe(5);
  });

  it.each([
    ['no route to the receiver', ['EsE ..  Rs']],
    ['kinds do not match', ['EsE S1 Rw']],
    ['a locked conduit faces the wrong way', ['EsE s0 Rs']],
    ['a gate filters the only route', ['EwE Gs1 Rw']],
    ['two pulses must share a conduit', ['EsE S0 S0 EwW', 'Rs  .. .. Rw']],
    ['more emitters than receivers', ['EsE S1 Rs EsW']],
    ['no emitters at all', ['Rs ..']],
  ])('reports unsolvable when %s', (_name, rows) => {
    expect(solve(boardState(rows)).status).toBe('unsolvable');
  });

  it('respects locked conduits that are already correct', () => {
    expect(solve(boardState(['EsE s1 S0 Rs']))).toMatchObject({ status: 'solved', cost: 1 });
  });

  it('gives up cleanly when the node budget runs out', () => {
    const board = parseBoard(FALLBACK_LEVELS.expert.rows);
    expect(solve(board, 3).status).toBe('budget_exceeded');
  });

  it('solves every authored board', () => {
    const levels = [...TUTORIAL_LEVELS, ...DIFFICULTY_BANDS.map((d) => FALLBACK_LEVELS[d])];
    for (const level of levels) {
      const board = parseBoard(level.rows);
      const result = solve(board);
      expect({ id: level.id, status: result.status }).toEqual({ id: level.id, status: 'solved' });
    }
  });
});

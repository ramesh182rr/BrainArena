import { neighbors, enter } from '../rules';
import { solveMaze } from '../solver';
import type { MazeCell, NumberMazeState } from '../types';
import { mazeState } from './helpers';
import { MAZE_TUTORIALS, MAZE_FALLBACKS } from '../authored';
import { DIFFICULTY_BANDS } from '@/game-runtime/contracts';
import { numberMaze } from '../module';

/** Independent breadth-first check: shortest route length, or null. */
function bfsShortest(s: NumberMazeState): number | null {
  type Node = { path: number[]; value: number };
  let frontier: Node[] = [{ path: [...s.path], value: s.startValue }];
  for (let depth = 1; frontier.length > 0 && depth <= s.cells.length; depth += 1) {
    const next: Node[] = [];
    for (const node of frontier) {
      for (const n of neighbors(s.width, s.height, node.path[node.path.length - 1]!)) {
        if (node.path.includes(n)) continue;
        const cell = s.cells[n] as MazeCell;
        const r = enter(s, cell, node.value);
        if (!r.ok) continue;
        if (cell.t === 'exit') return depth;
        next.push({ path: [...node.path, n], value: r.value });
      }
    }
    frontier = next;
  }
  return null;
}

describe('solveMaze', () => {
  it('finds the shortest route and counts all routes', () => {
    // Two routes reach 9: the short one (4 moves) and none longer here.
    const s = mazeState('start=5 target=9 min=0 max=20', ['S  +2 -1', '+6 ## +3', '-4 +1 E']);
    expect(solveMaze(s, s.path, 5)).toMatchObject({ status: 'solved', moves: 4, solutions: 1, path: [0, 1, 2, 5, 8] });
  });

  it('reports unsolvable mazes', () => {
    const s = mazeState('start=5 target=99 min=0 max=20', ['S  +2 -1', '+6 ## +3', '-4 +1 E']);
    expect(solveMaze(s, s.path, 5).status).toBe('unsolvable');
  });

  it('stops counting at the cap and respects the node budget', () => {
    // Each room changes the value by ±1 and every route passes an odd number of rooms, so the target must be even.
    const open = mazeState('start=5 target=6 min=0 max=50', ['S  +1 -1 +1', '-1 +1 -1 +1', '+1 -1 +1 -1', '-1 +1 -1 E']);
    const capped = solveMaze(open, open.path, 5, { solutionCap: 2 });
    expect(capped).toMatchObject({ status: 'solved', solutions: 2 });
    expect(solveMaze(open, open.path, 5, { budget: 3 }).status).toBe('budget_exceeded');
  });

  it('agrees with an independent breadth-first search on authored and generated mazes', () => {
    const levels = [
      ...MAZE_TUTORIALS.map((t) => numberMaze.createLevel(t.id, t.difficulty).initialState),
      ...DIFFICULTY_BANDS.map((d) => numberMaze.fallbackLevel(d).initialState),
      ...Array.from({ length: 15 }, (_, i) => numberMaze.createLevel(`bfs-${i}`, i % 2 ? 'easy' : 'standard').initialState),
    ];
    for (const s of levels) {
      const r = solveMaze(s, s.path, s.startValue);
      expect(r.status).toBe('solved');
      if (r.status === 'solved') expect(r.moves).toBe(bfsShortest(s));
    }
    expect(Object.keys(MAZE_FALLBACKS)).toHaveLength(5);
  });
});

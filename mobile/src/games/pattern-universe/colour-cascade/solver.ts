import { applyDrop, inBloom, padIndices } from './rules';
import type { Bloom, CascadeState, GardenCell, Inventory } from './types';

export type GardenSolveResult =
  | { status: 'solved'; drops: { index: number; colour: Bloom }[]; nodes: number }
  | { status: 'unsolvable'; nodes: number }
  | { status: 'budget_exceeded'; nodes: number };

export const DEFAULT_GARDEN_BUDGET = 250_000;

type Board = Pick<CascadeState, 'width' | 'height' | 'cycle' | 'cells'>;

const keyOf = (cells: readonly GardenCell[], inv: Inventory | null) =>
  cells.map((c) => (c.t === 'stone' ? '#' : `${c.colour[0]}${c.hardy ? '*' : ''}`)).join('') + (inv ? JSON.stringify(inv) : '');

interface Node {
  cells: readonly GardenCell[];
  inventory: Inventory | null;
  drops: { index: number; colour: Bloom }[];
}

/**
 * Breadth-first search for the fewest drops that bring the garden into full
 * bloom. With an inventory, only those droplets may be used; with `null`,
 * any colour in the cycle may be dropped (used by the generator).
 */
export function solveGarden(
  board: Board,
  inventory: Inventory | null,
  options: { maxDrops?: number; budget?: number } = {},
): GardenSolveResult {
  const maxDrops = options.maxDrops ?? 6;
  const budget = options.budget ?? DEFAULT_GARDEN_BUDGET;
  const pads = padIndices(board.cells);
  if (inBloom(board.cells)) return { status: 'solved', drops: [], nodes: 0 };
  let frontier: Node[] = [{ cells: board.cells, inventory, drops: [] }];
  const seen = new Set([keyOf(board.cells, inventory)]);
  let nodes = 0;
  for (let depth = 1; depth <= maxDrops && frontier.length > 0; depth += 1) {
    const next: Node[] = [];
    for (const node of frontier) {
      const colours = node.inventory ? board.cycle.filter((c) => (node.inventory![c] ?? 0) > 0) : board.cycle;
      for (const colour of colours) {
        for (const index of pads) {
          nodes += 1;
          if (nodes > budget) return { status: 'budget_exceeded', nodes };
          const { cells, wave } = applyDrop({ ...board, cells: node.cells }, index, colour);
          // A drop that changes nothing (same colour, no shell, nothing eaten) is never useful.
          if (wave.length === 1 && keyOf(cells, null) === keyOf(node.cells, null)) continue;
          const inv = node.inventory ? { ...node.inventory, [colour]: (node.inventory[colour] ?? 0) - 1 } : null;
          const drops = [...node.drops, { index, colour }];
          if (inBloom(cells)) return { status: 'solved', drops, nodes };
          const key = keyOf(cells, inv);
          if (seen.has(key)) continue;
          seen.add(key);
          next.push({ cells, inventory: inv, drops });
        }
      }
    }
    frontier = next;
  }
  return { status: 'unsolvable', nodes };
}

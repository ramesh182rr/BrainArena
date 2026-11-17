import type { Bloom, CascadeState, GardenCell, Inventory } from './types';

const DR = [-1, 0, 1, 0] as const;
const DC = [0, 1, 0, -1] as const;

export function neighbors(width: number, height: number, index: number): number[] {
  const r = Math.floor(index / width);
  const c = index % width;
  const out: number[] = [];
  for (let d = 0; d < 4; d += 1) {
    const nr = r + DR[d]!;
    const nc = c + DC[d]!;
    if (nr >= 0 && nr < height && nc >= 0 && nc < width) out.push(nr * width + nc);
  }
  return out;
}

/** The colour that `colour` eats in this garden's cycle. */
export function prey(cycle: readonly Bloom[], colour: Bloom): Bloom {
  const i = cycle.indexOf(colour);
  return cycle[(i + 1) % cycle.length] as Bloom;
}

export interface DropResult {
  cells: GardenCell[];
  /** Plants changed or unshelled, in cascade order. */
  wave: number[];
}

/**
 * Drops `colour` on the pad at `index`. The target plant takes the colour
 * (or loses its shell if hardy). From every plant that changed, the colour
 * spreads to neighbouring plants of its prey; a hardy neighbour loses its
 * shell instead, the spread stops there, and that plant stays safe for the
 * rest of this wave.
 */
export function applyDrop(
  board: Pick<CascadeState, 'width' | 'height' | 'cycle' | 'cells'>,
  index: number,
  colour: Bloom,
): DropResult {
  const cells = board.cells.map((c) => ({ ...c })) as GardenCell[];
  const target = cells[index];
  if (!target || target.t !== 'plant') return { cells, wave: [] };
  if (target.hardy) {
    cells[index] = { ...target, hardy: false };
    return { cells, wave: [index] };
  }
  cells[index] = { ...target, colour };
  const wave = [index];
  const eats = prey(board.cycle, colour);
  const queue = [index];
  // A shell cracked in this wave still protects its plant until the next drop.
  const cracked = new Set<number>();
  while (queue.length > 0) {
    const at = queue.shift() as number;
    for (const n of neighbors(board.width, board.height, at)) {
      const cell = cells[n];
      if (!cell || cell.t !== 'plant' || cell.colour !== eats || cracked.has(n)) continue;
      if (cell.hardy) {
        cells[n] = { ...cell, hardy: false };
        cracked.add(n);
        wave.push(n);
        continue;
      }
      cells[n] = { ...cell, colour };
      wave.push(n);
      queue.push(n);
    }
  }
  return { cells, wave };
}

/** Full bloom: every plant shares one colour (shells do not matter). */
export function inBloom(cells: readonly GardenCell[]): boolean {
  let colour: Bloom | null = null;
  for (const c of cells) {
    if (c.t !== 'plant') continue;
    if (colour === null) colour = c.colour;
    else if (c.colour !== colour) return false;
  }
  return colour !== null;
}

export function bloomColour(cells: readonly GardenCell[]): Bloom | null {
  return inBloom(cells) ? ((cells.find((c) => c.t === 'plant') as { colour: Bloom } | undefined)?.colour ?? null) : null;
}

export function dropsLeft(inventory: Inventory): number {
  return Object.values(inventory).reduce((a, b) => a + (b ?? 0), 0);
}

export function canDrop(state: CascadeState, index: number, colour: Bloom): boolean {
  const cell = state.cells[index];
  return (
    Number.isInteger(index) &&
    cell?.t === 'plant' &&
    cell.pad &&
    (state.inventory[colour] ?? 0) > 0 &&
    state.cycle.includes(colour) &&
    !inBloom(state.cells)
  );
}

export function padIndices(cells: readonly GardenCell[]): number[] {
  return cells.flatMap((c, i) => (c.t === 'plant' && c.pad ? [i] : []));
}

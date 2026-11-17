import type { Cell, Dir } from './types';

const DR = [-1, 0, 1, 0] as const;
const DC = [0, 1, 0, -1] as const;

export const DIRS: readonly Dir[] = [0, 1, 2, 3];

export function opposite(d: Dir): Dir {
  return ((d + 2) % 4) as Dir;
}

export function rotateDir(d: Dir, quarterTurns: number): Dir {
  return ((((d + quarterTurns) % 4) + 4) % 4) as Dir;
}

/** Index of the neighbouring cell in direction `dir`, or null at the board edge. */
export function neighbor(width: number, height: number, index: number, dir: Dir): number | null {
  const r = Math.floor(index / width) + DR[dir];
  const c = (index % width) + DC[dir];
  if (r < 0 || r >= height || c < 0 || c >= width) return null;
  return r * width + c;
}

export function isRotatable(cell: Cell): boolean {
  return (cell.t === 'straight' || cell.t === 'bend') && !cell.locked;
}

/** True for cells whose rotation matters (conduits other than crossings). */
export function hasOrientation(cell: Cell): boolean {
  return cell.t === 'straight' || cell.t === 'bend' || cell.t === 'gate';
}

/** Open sides of an oriented conduit, or null for cells that are not oriented conduits. */
export function openSides(cell: Cell, rotation: number): readonly [Dir, Dir] | null {
  switch (cell.t) {
    case 'straight':
    case 'gate':
      return [rotateDir(0, rotation), rotateDir(2, rotation)];
    case 'bend':
      return [rotateDir(0, rotation), rotateDir(1, rotation)];
    default:
      return null;
  }
}

/**
 * Direction a pulse leaves a conduit after entering it while moving `moving`,
 * or null when the side it arrives at is closed. Ignores gate kind filtering.
 */
export function exitDir(cell: Cell, rotation: number, moving: Dir): Dir | null {
  if (cell.t === 'cross') return moving;
  const sides = openSides(cell, rotation);
  if (!sides) return null;
  const entry = opposite(moving);
  if (sides[0] === entry) return sides[1];
  if (sides[1] === entry) return sides[0];
  return null;
}

/** Whether two rotations put a conduit in the same physical orientation. */
export function sameOrientation(cell: Cell, a: number, b: number): boolean {
  if (cell.t === 'straight' || cell.t === 'gate') return a % 2 === b % 2;
  if (cell.t === 'bend') return a % 4 === b % 4;
  return true;
}

/** Fewest clockwise quarter turns from rotation `from` to an orientation equal to `to`. */
export function turnsBetween(cell: Cell, from: number, to: number): number {
  const cw = (target: number) => (((target - from) % 4) + 4) % 4;
  if (cell.t === 'straight' || cell.t === 'gate') return Math.min(cw(to % 2), cw((to % 2) + 2));
  if (cell.t === 'bend') return cw(to);
  return 0;
}

/**
 * Rotations of a rotatable conduit that accept a pulse moving `moving`,
 * one per distinct orientation, cheapest first from `current`.
 */
export function candidateRotations(cell: Cell, current: number, moving: Dir): number[] {
  const entry = opposite(moving);
  if (cell.t === 'straight') {
    const axis = entry % 2;
    return [current % 2 === axis ? current : (current + 1) % 4];
  }
  if (cell.t === 'bend') {
    const options = [entry, rotateDir(entry, 3)];
    return options.sort((a, b) => turnsBetween(cell, current, a) - turnsBetween(cell, current, b));
  }
  return [];
}

/** Rotation for a conduit that a pulse enters moving `inDir` and leaves moving `outDir`. */
export function rotationFor(inDir: Dir, outDir: Dir): { t: 'straight' | 'bend'; rotation: number } {
  if (inDir === outDir) return { t: 'straight', rotation: inDir % 2 };
  const a = opposite(inDir);
  for (let r = 0; r < 4; r += 1) {
    const s0 = rotateDir(0, r);
    const s1 = rotateDir(1, r);
    if ((s0 === a && s1 === outDir) || (s1 === a && s0 === outDir)) return { t: 'bend', rotation: r };
  }
  throw new Error(`Pulse cannot reverse: in ${inDir}, out ${outDir}`);
}

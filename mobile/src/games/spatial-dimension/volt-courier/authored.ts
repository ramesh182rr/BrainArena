import type { DifficultyBand } from '@/game-runtime/contracts';

import type { Cell, Dir, PulseKind } from './types';

/**
 * Hand-authored boards in a compact text format, one token per cell:
 *
 *   ..    empty
 *   S0-3  rotatable straight, with its starting rotation
 *   B0-3  rotatable bend
 *   s0-3  locked straight      b0-3  locked bend
 *   X     crossing
 *   Gk0-3 gate for kind k (s = spark, w = wave, f = flux), fixed rotation
 *   EkD   emitter of kind k firing toward D (N, E, S, W)
 *   Rk    receiver of kind k
 */

export interface AuthoredLevel {
  id: string;
  difficulty: DifficultyBand;
  /** Shown before play; teaches exactly one idea. */
  intro: string;
  rows: readonly string[];
}

export interface ParsedBoard {
  width: number;
  height: number;
  cells: Cell[];
  rotations: number[];
}

const KINDS: Record<string, PulseKind> = { s: 'spark', w: 'wave', f: 'flux' };
const DIRS: Record<string, Dir> = { N: 0, E: 1, S: 2, W: 3 };

function parseRotation(token: string, ch: string | undefined): number {
  const r = Number(ch);
  if (!Number.isInteger(r) || r < 0 || r > 3) throw new Error(`Bad rotation in token "${token}"`);
  return r;
}

function parseKind(token: string, ch: string | undefined): PulseKind {
  const kind = ch ? KINDS[ch] : undefined;
  if (!kind) throw new Error(`Bad pulse kind in token "${token}"`);
  return kind;
}

function parseToken(token: string): { cell: Cell; rotation: number } {
  const head = token[0];
  switch (head) {
    case '.':
      if (token !== '..') break;
      return { cell: { t: 'empty' }, rotation: 0 };
    case 'S':
    case 's':
      return { cell: { t: 'straight', locked: head === 's' }, rotation: parseRotation(token, token[1]) };
    case 'B':
    case 'b':
      return { cell: { t: 'bend', locked: head === 'b' }, rotation: parseRotation(token, token[1]) };
    case 'X':
      if (token !== 'X') break;
      return { cell: { t: 'cross' }, rotation: 0 };
    case 'G':
      return { cell: { t: 'gate', kind: parseKind(token, token[1]) }, rotation: parseRotation(token, token[2]) };
    case 'E': {
      const dir = token[2] ? DIRS[token[2]] : undefined;
      if (dir === undefined || token.length !== 3) break;
      return { cell: { t: 'emitter', kind: parseKind(token, token[1]), dir }, rotation: 0 };
    }
    case 'R':
      if (token.length !== 2) break;
      return { cell: { t: 'receiver', kind: parseKind(token, token[1]) }, rotation: 0 };
    default:
      break;
  }
  throw new Error(`Unknown board token "${token}"`);
}

export function parseBoard(rows: readonly string[]): ParsedBoard {
  const grid = rows.map((row) => row.trim().split(/\s+/));
  const width = grid[0]?.length ?? 0;
  if (width === 0) throw new Error('Board has no cells');
  const cells: Cell[] = [];
  const rotations: number[] = [];
  grid.forEach((tokens, r) => {
    if (tokens.length !== width) throw new Error(`Row ${r} has ${tokens.length} cells, expected ${width}`);
    for (const token of tokens) {
      const parsed = parseToken(token);
      cells.push(parsed.cell);
      rotations.push(parsed.rotation);
    }
  });
  return { width, height: grid.length, cells, rotations };
}

/** Tutorial sequence: one new idea per level. */
export const TUTORIAL_LEVELS: readonly AuthoredLevel[] = [
  {
    id: 'tutorial-1',
    difficulty: 'intro',
    intro: 'Tap a junction to turn it. Guide the spark ▲ from its emitter to the matching receiver.',
    rows: [
      'EsE S0  S1  B0',
      '..  ..  ..  S1',
      '..  ..  Rs  B3',
    ],
  },
  {
    id: 'tutorial-2',
    difficulty: 'easy',
    intro: 'Each pulse only powers a receiver of its own kind. Route the spark ▲ and the wave ● home.',
    rows: [
      'EsE S0  B0  ..',
      '..  ..  S0  ..',
      '..  ..  B0  Rs',
      'EwE S0  S0  Rw',
    ],
  },
  {
    id: 'tutorial-3',
    difficulty: 'standard',
    intro: 'Two currents can never share a conduit, except at a crossing, where they pass straight through each other.',
    rows: [
      '..  EwS ..  ..',
      'EsE X   S0  Rs',
      '..  S1  ..  ..',
      '..  B2  S0  Rw',
    ],
  },
];

/**
 * Curated fallback boards, served when procedural generation fails validation.
 * Each band has its own board so a fallback never feels like a tutorial replay.
 */
export const FALLBACK_LEVELS: Readonly<Record<DifficultyBand, AuthoredLevel>> = {
  intro: {
    id: 'fallback-intro',
    difficulty: 'intro',
    intro: '',
    rows: [
      '..  ..  ..  ..',
      'B1  S0  B3  ..',
      'S1  ..  S0  ..',
      'EsN ..  Rs  ..',
    ],
  },
  easy: {
    id: 'fallback-easy',
    difficulty: 'easy',
    intro: '',
    rows: [
      'EwS ..  ..  ..  ..',
      'B1  S0  S1  B3  ..',
      '..  ..  ..  S0  ..',
      'EsE S0  B2  Rw  ..',
      '..  ..  S1  ..  ..',
      '..  ..  Rs  ..  ..',
    ],
  },
  standard: {
    id: 'fallback-standard',
    difficulty: 'standard',
    intro: '',
    rows: [
      '..  ..  EwS ..  ..',
      'EsE S0  X   B0  ..',
      '..  ..  S1  S0  ..',
      '..  ..  S1  B2  Rs',
      '..  ..  Rw  ..  ..',
    ],
  },
  advanced: {
    id: 'fallback-advanced',
    difficulty: 'advanced',
    intro: '',
    rows: [
      '..  EwS ..  ..  ..  ..',
      'EsE X   Gs1 S0  B1  ..',
      '..  S1  ..  ..  S1  ..',
      '..  B2  S0  B0  B0  Rs',
      '..  ..  ..  S1  ..  ..',
      'EfE S0  S0  X   S1  Rf',
      '..  ..  ..  Rw  ..  ..',
    ],
  },
  expert: {
    id: 'fallback-expert',
    difficulty: 'expert',
    intro: '',
    rows: [
      '..  EwS ..  EfS ..  ..  ..',
      'EsE X   S0  X   S0  Rs  ..',
      '..  S1  B1  S1  ..  B2  ..',
      '..  B3  Gw1 X   B0  ..  ..',
      '..  B0  S0  S1  S1  ..  ..',
      '..  Rf  S0  B1  Rw  S1  ..',
      '..  ..  ..  ..  ..  ..  ..',
    ],
  },
};

export function findAuthoredLevel(id: string): AuthoredLevel | undefined {
  return TUTORIAL_LEVELS.find((l) => l.id === id) ?? Object.values(FALLBACK_LEVELS).find((l) => l.id === id);
}

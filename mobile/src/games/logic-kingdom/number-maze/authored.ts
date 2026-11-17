import type { DifficultyBand } from '@/game-runtime/contracts';

import type { MazeCell, Op } from './types';

/**
 * Hand-made mazes in a compact text format.
 * Header: `start=<n> target=<n> min=<n> max=<n>`
 * Cells:  S start · E exit · ## sealed · EV / OD even / odd lock · +n −n xn /n gates
 */
export interface AuthoredMaze {
  id: string;
  difficulty: DifficultyBand;
  /** Shown before play; teaches exactly one idea. */
  intro: string;
  header: string;
  rows: readonly string[];
}

export interface ParsedMaze {
  width: number;
  height: number;
  cells: MazeCell[];
  startValue: number;
  target: number;
  min: number;
  max: number;
}

const OPS: Record<string, Op> = { '+': 'add', '-': 'sub', x: 'mul', '/': 'div' };

function parseCell(token: string): MazeCell {
  if (token === 'S') return { t: 'start' };
  if (token === 'E') return { t: 'exit' };
  if (token === '##') return { t: 'block' };
  if (token === 'EV') return { t: 'lock', rule: 'even' };
  if (token === 'OD') return { t: 'lock', rule: 'odd' };
  const op = OPS[token[0] ?? ''];
  const n = Number(token.slice(1));
  if (op && Number.isInteger(n) && n > 0) return { t: 'gate', op, n };
  throw new Error(`Unknown maze token "${token}"`);
}

export function parseMaze(header: string, rows: readonly string[]): ParsedMaze {
  const fields = Object.fromEntries(header.trim().split(/\s+/).map((kv) => kv.split('=') as [string, string]));
  const num = (k: string) => {
    const v = Number(fields[k]);
    if (!Number.isInteger(v)) throw new Error(`Maze header needs an integer "${k}"`);
    return v;
  };
  const grid = rows.map((r) => r.trim().split(/\s+/));
  const width = grid[0]?.length ?? 0;
  grid.forEach((row, i) => {
    if (row.length !== width) throw new Error(`Row ${i} has ${row.length} cells, expected ${width}`);
  });
  const cells = grid.flat().map(parseCell);
  if (cells.filter((c) => c.t === 'start').length !== 1) throw new Error('Maze needs exactly one start');
  if (cells.filter((c) => c.t === 'exit').length !== 1) throw new Error('Maze needs exactly one exit');
  return { width, height: grid.length, cells, startValue: num('start'), target: num('target'), min: num('min'), max: num('max') };
}

export const MAZE_TUTORIALS: readonly AuthoredMaze[] = [
  {
    id: 'tutorial-1',
    difficulty: 'intro',
    intro: 'Tap a neighbouring room to step in. Each room changes your number. Reach the exit holding exactly the target.',
    header: 'start=5 target=9 min=0 max=20',
    rows: ['S  +2 -1', '+6 ## +3', '-4 +1 E'],
  },
  {
    id: 'tutorial-2',
    difficulty: 'easy',
    intro: '× multiplies. The long way round is not always the right way — count before you walk.',
    header: 'start=3 target=14 min=0 max=40',
    rows: ['S  x2 +5', '+4 ## -3', 'x2 E  +2'],
  },
  {
    id: 'tutorial-3',
    difficulty: 'standard',
    intro: '÷ must divide exactly, and your number must stay between the minimum and maximum shown above the maze.',
    header: 'start=8 target=2 min=0 max=20',
    rows: ['S  /2 /2', 'x3 ## E', '+4 -3 +1'],
  },
  {
    id: 'tutorial-4',
    difficulty: 'advanced',
    intro: 'Locks keep your number but only open for the right kind: EVEN needs an even number, ODD an odd one.',
    header: 'start=4 target=6 min=0 max=30',
    rows: ['S  +3 OD', '## ## +1', 'E  -2 EV'],
  },
];

/** Curated fallbacks per band, served when generation fails validation. Frozen from reviewed generator output. */
export const MAZE_FALLBACKS: Readonly<Record<DifficultyBand, AuthoredMaze>> = {
  intro: {
    id: 'fallback-intro',
    difficulty: 'intro',
    intro: '',
    header: 'start=11 target=6 min=0 max=20',
    rows: ['+1 -3 E', '+2 +1 -3', '-5 S  +3'],
  },
  easy: {
    id: 'fallback-easy',
    difficulty: 'easy',
    intro: '',
    header: 'start=2 target=1 min=0 max=40',
    rows: ['x3 x2 E  -6', 'x2 +2 -2 +3', 'S  x2 -3 ##', '+3 +5 x2 +3'],
  },
  standard: {
    id: 'fallback-standard',
    difficulty: 'standard',
    intro: '',
    header: 'start=8 target=3 min=0 max=50',
    rows: ['+7 ## +7 -3', '+4 /3 x2 -4', 'S  x3 x2 ##', '-6 /2 /2 /3', '-4 /2 E  /3'],
  },
  advanced: {
    id: 'fallback-advanced',
    difficulty: 'advanced',
    intro: '',
    header: 'start=9 target=14 min=0 max=40',
    rows: ['x3 /2 +5 EV +3', 'EV +4 x2 E  x2', '-3 +2 +1 +1 ##', 'S  +3 +8 x2 +2', '/2 ## -5 -8 -2'],
  },
  expert: {
    id: 'fallback-expert',
    difficulty: 'expert',
    intro: '',
    header: 'start=2 target=28 min=0 max=30',
    rows: ['## -8 S  ## +1', '/3 x2 /2 /2 -3', 'x3 ## OD -9 -9', '+3 E  x3 /2 x3', '-5 x2 OD x3 x2', 'x3 x3 -4 /2 EV'],
  },
};

export function findAuthoredMaze(id: string): AuthoredMaze | undefined {
  return MAZE_TUTORIALS.find((m) => m.id === id) ?? Object.values(MAZE_FALLBACKS).find((m) => m.id === id);
}

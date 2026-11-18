import type { DifficultyBand, GameHint, GameModule, HintTier, PuzzleLevel, ValidationResult } from '@/game-runtime/contracts';
import { createRng, fingerprint, levelSeedKey, type Rng } from '@/game-runtime/rng';

/**
 * Meow Grid (W2-G01): symbol constraint lattice.
 *
 * Place cats so every row, column and outlined region holds each cat once.
 * Paired echo cells (in different regions) must hold the same cat. Every grid
 * has exactly one solution.
 */

export const CATS = ['Tabby', 'Ginger', 'Shadow', 'Snow', 'Patch', 'Socks'] as const;

export interface MeowState {
  band: DifficultyBand;
  size: number;
  /** Region id for each cell, row-major. */
  regions: readonly number[];
  /** Pairs of cells that must hold the same cat. */
  echoes: readonly (readonly [number, number])[];
  givens: readonly (number | null)[];
  solution: readonly number[];
  cells: readonly (number | null)[];
  selected: number | null;
  history: readonly (readonly (number | null)[])[];
  wrongPlacements: number;
}

export type MeowAction = { type: 'select'; cell: number } | { type: 'place'; cat: number } | { type: 'clear' } | { type: 'undo' } | { type: 'reset' };

export const MEOW_GRID_ID = 'W2-G01';
export const MEOW_GRID_VERSION = '1.0.0';

type Board = Pick<MeowState, 'size' | 'regions' | 'echoes'>;

function peers(b: Board): number[][] {
  const n = b.size;
  const out: number[][] = Array.from({ length: n * n }, () => []);
  for (let i = 0; i < n * n; i += 1) {
    for (let j = 0; j < n * n; j += 1) {
      if (i === j) continue;
      const sameRow = Math.floor(i / n) === Math.floor(j / n);
      const sameCol = i % n === j % n;
      if (sameRow || sameCol || b.regions[i] === b.regions[j]) out[i]!.push(j);
    }
  }
  return out;
}

function echoPartner(b: Board): Map<number, number> {
  const m = new Map<number, number>();
  for (const [x, y] of b.echoes) {
    m.set(x, y);
    m.set(y, x);
  }
  return m;
}

/** Counts solutions (stopping at `limit`); fills `out` with the first one found. */
export function countSolutions(b: Board, cells: readonly (number | null)[], limit = 2, rng?: Rng, out?: number[], budget = 200_000): number {
  const n = b.size;
  const P = peers(b);
  const E = echoPartner(b);
  const grid = [...cells];
  let count = 0;
  let nodes = 0;
  const candidates = (i: number): number[] => {
    const used = new Set(P[i]!.map((j) => grid[j]).filter((v): v is number => v !== null && v !== undefined));
    const partner = E.get(i);
    const echo = partner !== undefined ? grid[partner] : null;
    const all = Array.from({ length: n }, (_, v) => v).filter((v) => !used.has(v) && (echo === null || echo === undefined || echo === v));
    return rng ? rng.shuffle(all) : all;
  };
  const go = (): void => {
    if (count >= limit) return;
    nodes += 1;
    // Out of budget: report "not unique" so the caller rejects or keeps the given.
    if (nodes > budget) {
      count = limit;
      return;
    }
    let best = -1;
    let bestC: number[] = [];
    for (let i = 0; i < n * n; i += 1) {
      if (grid[i] !== null) continue;
      const c = candidates(i);
      if (c.length === 0) return;
      if (best < 0 || c.length < bestC.length) {
        best = i;
        bestC = c;
      }
    }
    if (best < 0) {
      count += 1;
      if (out && count === 1) out.splice(0, out.length, ...(grid as number[]));
      return;
    }
    for (const v of bestC) {
      grid[best] = v;
      go();
      grid[best] = null;
      if (count >= limit) return;
    }
  };
  // Givens must not already clash.
  for (let i = 0; i < n * n; i += 1) {
    const v = grid[i];
    if (v === null || v === undefined) continue;
    if (P[i]!.some((j) => grid[j] === v)) return 0;
    const partner = E.get(i);
    if (partner !== undefined && grid[partner] !== null && grid[partner] !== v) return 0;
  }
  go();
  return count;
}

/** Cells that break a rule, for live highlighting. */
export function conflicts(s: Pick<MeowState, 'size' | 'regions' | 'echoes' | 'cells'>): Set<number> {
  const P = peers(s);
  const bad = new Set<number>();
  s.cells.forEach((v, i) => {
    if (v === null) return;
    if (P[i]!.some((j) => s.cells[j] === v)) bad.add(i);
  });
  for (const [x, y] of s.echoes) {
    const a = s.cells[x];
    const b = s.cells[y];
    if (a !== null && b !== null && a !== undefined && b !== undefined && a !== b) {
      bad.add(x);
      bad.add(y);
    }
  }
  return bad;
}

function boxRegions(n: number): number[] | null {
  if (n !== 4 && n !== 6) return null;
  const bh = 2;
  const bw = n / 2;
  return Array.from({ length: n * n }, (_, i) => Math.floor(Math.floor(i / n) / bh) * (n / bw) + Math.floor((i % n) / bw));
}

function connected(region: readonly number[], n: number, r: number): boolean {
  const cells = region.flatMap((x, i) => (x === r ? [i] : []));
  const seen = new Set([cells[0]!]);
  const stack = [cells[0]!];
  while (stack.length) {
    const i = stack.pop()!;
    for (const j of [i - n, i + n, i % n ? i - 1 : -1, i % n < n - 1 ? i + 1 : -1]) {
      if (j >= 0 && j < n * n && region[j] === r && !seen.has(j)) {
        seen.add(j);
        stack.push(j);
      }
    }
  }
  return seen.size === cells.length;
}

/**
 * Irregular regions: start from regular boxes (or rows for 5×5) and swap
 * neighbouring border cells between regions, keeping every region connected
 * and the same size. These shapes admit Latin solutions far more often than
 * freely grown regions.
 */
function randomRegions(rng: Rng, n: number): number[] | null {
  const region = boxRegions(n) ?? Array.from({ length: n * n }, (_, i) => Math.floor(i / n));
  const swaps = n * n * 2;
  for (let k = 0; k < swaps; k += 1) {
    const i = rng.int(0, n * n - 1);
    const nbs = [i - n, i + n, i % n ? i - 1 : -1, i % n < n - 1 ? i + 1 : -1].filter((j) => j >= 0 && j < n * n && region[j] !== region[i]);
    if (nbs.length === 0) continue;
    const j = rng.pick(nbs);
    const ri = region[i]!;
    const rj = region[j]!;
    // Give cell i to region rj and take some cell of rj adjacent to ri back, so sizes stay equal.
    const back = region.flatMap((x, c) =>
      x === rj && c !== j && [c - n, c + n, c % n ? c - 1 : -1, c % n < n - 1 ? c + 1 : -1].some((d) => d >= 0 && d < n * n && region[d] === ri && d !== i) ? [c] : [],
    );
    if (back.length === 0) continue;
    const c = rng.pick(back);
    region[i] = rj;
    region[c] = ri;
    if (!connected(region, n, ri) || !connected(region, n, rj)) {
      region[i] = ri;
      region[c] = rj;
    }
  }
  return region;
}

interface Profile {
  size: number;
  irregular: boolean;
  echoes: number;
  minGivens: number;
}

export const MEOW_PROFILES: Readonly<Record<DifficultyBand, Profile>> = {
  intro: { size: 4, irregular: false, echoes: 0, minGivens: 8 },
  easy: { size: 4, irregular: true, echoes: 0, minGivens: 6 },
  standard: { size: 5, irregular: true, echoes: 0, minGivens: 9 },
  advanced: { size: 5, irregular: true, echoes: 2, minGivens: 7 },
  expert: { size: 6, irregular: true, echoes: 2, minGivens: 12 },
};

export function assembleMeow(band: DifficultyBand, size: number, regions: readonly number[], echoes: readonly (readonly [number, number])[], givens: readonly (number | null)[], solution: readonly number[]): MeowState {
  return { band, size, regions, echoes, givens, solution, cells: givens, selected: null, history: [], wrongPlacements: 0 };
}

function tryBuild(rng: Rng, band: DifficultyBand, p: Profile): MeowState | null {
  const n = p.size;
  const regions = p.irregular ? randomRegions(rng, n) : boxRegions(n);
  if (!regions) return null;
  const board = { size: n, regions, echoes: [] as [number, number][] };
  const solution: number[] = [];
  if (countSolutions(board, new Array(n * n).fill(null), 1, rng, solution, 20_000) === 0 || solution.length !== n * n) return null;
  const echoes: [number, number][] = [];
  const cells = rng.shuffle(Array.from({ length: n * n }, (_, i) => i));
  for (const x of cells) {
    if (echoes.length >= p.echoes) break;
    const y = cells.find(
      (c) => c !== x && solution[c] === solution[x] && regions[c] !== regions[x] && !echoes.some(([a, b]) => [a, b].includes(c) || [a, b].includes(x)),
    );
    if (y !== undefined) echoes.push([x, y]);
  }
  if (echoes.length < p.echoes) return null;
  const full = { size: n, regions, echoes };
  const givens: (number | null)[] = [...solution];
  for (const i of rng.shuffle(Array.from({ length: n * n }, (_, k) => k))) {
    if (givens.filter((g) => g !== null).length <= p.minGivens) break;
    const keep = givens[i]!;
    givens[i] = null;
    if (countSolutions(full, givens) !== 1) givens[i] = keep;
  }
  return assembleMeow(band, n, regions, echoes, givens, solution);
}

export function generateMeow(key: string, band: DifficultyBand): MeowState {
  const rng = createRng(key);
  for (let i = 0; i < 200; i += 1) {
    const s = tryBuild(rng, band, MEOW_PROFILES[band]);
    if (s) return s;
  }
  throw new Error('No acceptable grid within the attempt budget');
}

export const MEOW_TUTORIALS = [
  { id: 'tutorial-1', difficulty: 'intro' as const, intro: 'Every row, column and outlined box needs each cat exactly once. Tap a square, then a cat.' },
  { id: 'tutorial-2', difficulty: 'easy' as const, intro: 'Regions can be any shape now. Follow the thick outlines.' },
  { id: 'tutorial-3', difficulty: 'advanced' as const, intro: 'Echo squares (matching ring letters) must hold the same cat, even in different regions.' },
];

export const meowFingerprint = (s: MeowState) => fingerprint(JSON.stringify([s.size, s.regions, s.echoes, s.givens]));
export const cellId = (i: number) => `cell-${i}`;

function toLevel(s: MeowState, seed: string, difficulty: DifficultyBand, source: PuzzleLevel['source'], levelId: string): PuzzleLevel<MeowState> {
  return { gameId: MEOW_GRID_ID, levelId, generatorVersion: MEOW_GRID_VERSION, seed, difficulty, source, fingerprint: meowFingerprint(s), initialState: s, metadata: { size: s.size, givens: s.givens.filter((g) => g !== null).length } };
}

/** Empty cells whose candidates narrow to a single cat, given the current grid. */
function singles(s: MeowState): { cell: number; cat: number }[] {
  const P = peers(s);
  const E = echoPartner(s);
  const out: { cell: number; cat: number }[] = [];
  s.cells.forEach((v, i) => {
    if (v !== null) return;
    const used = new Set(P[i]!.map((j) => s.cells[j]).filter((x): x is number => x !== null && x !== undefined));
    const partner = E.get(i);
    const echo = partner !== undefined ? s.cells[partner] : null;
    const c = Array.from({ length: s.size }, (_, k) => k).filter((k) => !used.has(k) && (echo === null || echo === undefined || echo === k));
    if (c.length === 1) out.push({ cell: i, cat: c[0]! });
  });
  return out;
}

export const filledCorrectly = (s: MeowState) => s.cells.every((v, i) => v === s.solution[i]);

export const meowGrid: GameModule<MeowState, MeowAction> = {
  id: MEOW_GRID_ID,
  version: MEOW_GRID_VERSION,
  createLevel(seed, difficulty) {
    const t = MEOW_TUTORIALS.find((x) => x.id === seed);
    const band = t ? t.difficulty : difficulty;
    const key = levelSeedKey(MEOW_GRID_ID, MEOW_GRID_VERSION, `${seed}/${band}`);
    return toLevel(generateMeow(key, band), seed, band, t ? 'authored' : 'generated', `${MEOW_GRID_ID}:${t ? seed : `${band}:${seed}`}`);
  },
  fallbackLevel(difficulty) {
    return toLevel(generateMeow(levelSeedKey(MEOW_GRID_ID, MEOW_GRID_VERSION, `curated/${difficulty}`), difficulty), 'curated', difficulty, 'fallback', `${MEOW_GRID_ID}:fallback-${difficulty}`);
  },
  validateLevel(level): ValidationResult {
    if (level.gameId !== MEOW_GRID_ID) return { valid: false, reasonCode: 'wrong_game' };
    const s = level.initialState;
    const n = s.size;
    if (![4, 5, 6].includes(n) || s.regions.length !== n * n || s.givens.length !== n * n) return { valid: false, reasonCode: 'bad_board' };
    for (let r = 0; r < n; r += 1) if (s.regions.filter((x) => x === r).length !== n) return { valid: false, reasonCode: 'bad_regions' };
    if (s.cells.some((v, i) => v !== s.givens[i]) || s.history.length) return { valid: false, reasonCode: 'bad_start' };
    const out: number[] = [];
    if (countSolutions(s, s.givens, 2, undefined, out) !== 1) return { valid: false, reasonCode: 'not_unique' };
    if (out.join() !== s.solution.join()) return { valid: false, reasonCode: 'solution_mismatch' };
    if (level.fingerprint !== meowFingerprint(s)) return { valid: false, reasonCode: 'fingerprint_mismatch' };
    return { valid: true, solutionFingerprint: fingerprint(s.solution.join()) };
  },
  reduce(s, a) {
    if (filledCorrectly(s)) return s;
    switch (a.type) {
      case 'select':
        return Number.isInteger(a.cell) && a.cell >= 0 && a.cell < s.cells.length && s.givens[a.cell] === null && s.selected !== a.cell ? { ...s, selected: a.cell } : s;
      case 'place': {
        const i = s.selected;
        if (i === null || !Number.isInteger(a.cat) || a.cat < 0 || a.cat >= s.size || s.cells[i] === a.cat) return s;
        const cells = [...s.cells];
        cells[i] = a.cat;
        return { ...s, cells, history: [...s.history, s.cells].slice(-60), wrongPlacements: s.wrongPlacements + (s.solution[i] === a.cat ? 0 : 1) };
      }
      case 'clear': {
        const i = s.selected;
        if (i === null || s.cells[i] === null) return s;
        const cells = [...s.cells];
        cells[i] = null;
        return { ...s, cells, history: [...s.history, s.cells].slice(-60) };
      }
      case 'undo': {
        const prev = s.history[s.history.length - 1];
        return prev ? { ...s, cells: prev, history: s.history.slice(0, -1) } : s;
      }
      case 'reset':
        return s.cells.some((v, i) => v !== s.givens[i]) ? { ...s, cells: s.givens, history: [...s.history, s.cells], selected: null } : s;
      default:
        return s;
    }
  },
  isComplete: filledCorrectly,
  score: (s, { hintsUsed }) => 100 + Math.max(0, 50 - Math.min(30, s.wrongPlacements * 3) - hintsUsed * 10),
  hint(s, tier: HintTier): GameHint {
    const wrong = s.cells.findIndex((v, i) => v !== null && v !== s.solution[i]);
    if (wrong >= 0 && (tier > 1 || conflicts(s).size > 0)) {
      return { tier, text: `The highlighted square is not ${CATS[s.cells[wrong]!]}.`, highlightIds: [cellId(wrong)] };
    }
    const found = singles(s);
    if (found.length === 0) return { tier, text: 'Look for a row, column or region missing just one cat.', highlightIds: [] };
    const first = found[0]!;
    if (tier === 1) return { tier, text: 'The highlighted square has only one cat that fits.', highlightIds: [cellId(first.cell)] };
    const show = found.slice(0, tier === 2 ? 1 : 2);
    return { tier, text: show.map((f) => `${CATS[f.cat]} fits the highlighted square.`).join(' '), highlightIds: show.map((f) => cellId(f.cell)) };
  },
};

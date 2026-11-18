import type { DifficultyBand, GameHint, GameModule, HintTier, PuzzleLevel, ValidationResult } from '@/game-runtime/contracts';
import { createRng, fingerprint, levelSeedKey, type Rng } from '@/game-runtime/rng';

/**
 * Pallet Ferry (W3-G02): layered cargo choreography.
 *
 * Crates walk on the warehouse floor but cannot cross pits. Platforms slide
 * over floor and pits alike, carrying any crates riding on them. A crate on
 * the floor blocks a platform; a platform never pushes. Get the gold crate to
 * the dock. Every level is solved by breadth-first search for an exact par.
 */

export type Tile = 'floor' | 'wall' | 'pit' | 'dock';
export interface Platform {
  /** Top-left cell. */
  at: number;
  w: number;
  h: number;
}
export type Dir = 0 | 1 | 2 | 3;
export type Piece = { kind: 'crate'; index: number } | { kind: 'platform'; index: number };

export interface EscapeState {
  band: DifficultyBand;
  width: number;
  height: number;
  tiles: readonly Tile[];
  platforms: readonly Platform[];
  /** Crate cells; crate 0 is the gold crate. */
  crates: readonly number[];
  par: number;
  selected: Piece | null;
  moves: number;
  history: { platforms: readonly Platform[]; crates: readonly number[] }[];
  start: { platforms: readonly Platform[]; crates: readonly number[] };
}

export type EscapeAction = { type: 'select'; piece: Piece } | { type: 'move'; dir: Dir } | { type: 'undo' } | { type: 'reset' };

export const BLOCK_ESCAPE_ID = 'W3-G02';
export const BLOCK_ESCAPE_VERSION = '1.0.0';
const DR = [-1, 0, 1, 0];
const DC = [0, 1, 0, -1];

export function platformCells(w: number, p: Platform): number[] {
  const out: number[] = [];
  for (let r = 0; r < p.h; r += 1) for (let c = 0; c < p.w; c += 1) out.push(p.at + r * w + c);
  return out;
}

type Board = Pick<EscapeState, 'width' | 'height' | 'tiles'>;
type Pos = { platforms: readonly Platform[]; crates: readonly number[] };

function step(b: Board, cell: number, d: Dir): number | null {
  const r = Math.floor(cell / b.width) + DR[d]!;
  const c = (cell % b.width) + DC[d]!;
  return r < 0 || r >= b.height || c < 0 || c >= b.width ? null : r * b.width + c;
}

/** Applies a move, or returns null when it is not allowed. */
export function tryMove(b: Board, pos: Pos, piece: Piece, d: Dir): Pos | null {
  if (piece.kind === 'platform') {
    const p = pos.platforms[piece.index];
    if (!p) return null;
    const old = platformCells(b.width, p);
    const moved = old.map((c) => step(b, c, d));
    if (moved.some((c) => c === null || b.tiles[c] === 'wall')) return null;
    const others = new Set(pos.platforms.flatMap((q, i) => (i === piece.index ? [] : platformCells(b.width, q))));
    if (moved.some((c) => others.has(c!))) return null;
    const oldSet = new Set(old);
    // Floor crates block; riding crates come along.
    if (pos.crates.some((c) => !oldSet.has(c) && moved.includes(c))) return null;
    const platforms = pos.platforms.map((q, i) => (i === piece.index ? { ...q, at: step(b, q.at, d)! } : q));
    const crates = pos.crates.map((c) => (oldSet.has(c) ? step(b, c, d)! : c));
    return { platforms, crates };
  }
  const from = pos.crates[piece.index];
  if (from === undefined) return null;
  const to = step(b, from, d);
  if (to === null || b.tiles[to] === 'wall' || pos.crates.includes(to)) return null;
  if (b.tiles[to] === 'pit' && !pos.platforms.some((q) => platformCells(b.width, q).includes(to))) return null;
  const crates = pos.crates.map((c, i) => (i === piece.index ? to : c));
  return { platforms: pos.platforms, crates };
}

export const atDock = (b: Board, pos: Pos) => b.tiles[pos.crates[0]!] === 'dock';
/** Numeric state key: every cell index is below 64, so each piece takes 6 bits. */
function posKey(pos: Pos): number {
  let k = 0;
  for (const p of pos.platforms) k = k * 64 + p.at;
  for (const c of pos.crates) k = k * 64 + c;
  return k;
}

/** Shortest solution as a list of (piece, dir) moves, or null. */
export function solveEscape(b: Board, start: Pos, cap = 40_000): { piece: Piece; dir: Dir }[] | null {
  if (atDock(b, start)) return [];
  const prev = new Map<number, { from: number; piece: Piece; dir: Dir } | null>([[posKey(start), null]]);
  let frontier = [start];
  while (frontier.length && prev.size < cap) {
    const next: Pos[] = [];
    for (const pos of frontier) {
      const k = posKey(pos);
      const pieces: Piece[] = [...pos.platforms.map((_, index) => ({ kind: 'platform' as const, index })), ...pos.crates.map((_, index) => ({ kind: 'crate' as const, index }))];
      for (const piece of pieces) {
        for (const dir of [0, 1, 2, 3] as Dir[]) {
          const n = tryMove(b, pos, piece, dir);
          if (!n) continue;
          const nk = posKey(n);
          if (prev.has(nk)) continue;
          prev.set(nk, { from: k, piece, dir });
          if (atDock(b, n)) {
            const path: { piece: Piece; dir: Dir }[] = [];
            let cur: number | undefined = nk;
            while (cur !== undefined) {
              const e = prev.get(cur);
              if (!e) break;
              path.unshift({ piece: e.piece, dir: e.dir });
              cur = e.from;
            }
            return path;
          }
          next.push(n);
        }
      }
    }
    frontier = next;
  }
  return null;
}

interface Profile {
  width: number;
  height: number;
  pitWidth: number;
  /** Number of pit bands the gold crate must cross. */
  pits?: number;
  platforms: readonly [number, number][];
  crates: number;
  walls: number;
  par: [number, number];
}

export const ESCAPE_PROFILES: Readonly<Record<DifficultyBand, Profile>> = {
  intro: { width: 5, height: 4, pitWidth: 1, platforms: [[1, 2]], crates: 0, walls: 1, par: [3, 6] },
  easy: { width: 5, height: 5, pitWidth: 1, platforms: [[1, 2]], crates: 1, walls: 2, par: [5, 9] },
  standard: { width: 6, height: 5, pitWidth: 2, platforms: [[2, 1], [1, 2]], crates: 1, walls: 3, par: [7, 12] },
  advanced: { width: 6, height: 5, pitWidth: 2, platforms: [[2, 1], [2, 2]], crates: 2, walls: 3, par: [8, 16] },
  expert: { width: 6, height: 5, pitWidth: 2, platforms: [[2, 1], [2, 2]], crates: 2, walls: 4, par: [10, 20] },
};

function tryBuild(rng: Rng, band: DifficultyBand, p: Profile): EscapeState | null {
  const { width: w, height: h } = p;
  const tiles: Tile[] = Array.from({ length: w * h }, () => 'floor');
  const pitStart = rng.int(1, w - 1 - p.pitWidth - 1);
  const pitCols: number[] = [];
  if ((p.pits ?? 1) === 2) {
    const first = rng.int(1, 2);
    const second = rng.int(first + p.pitWidth + 1, w - 1 - p.pitWidth);
    for (const start of [first, second]) for (let c = start; c < start + p.pitWidth; c += 1) pitCols.push(c);
  } else for (let c = pitStart; c < pitStart + p.pitWidth; c += 1) pitCols.push(c);
  const firstPit = Math.min(...pitCols);
  const lastPit = Math.max(...pitCols);
  for (let r = 0; r < h; r += 1) for (const c of pitCols) tiles[r * w + c] = 'pit';
  const dock = rng.int(0, h - 1) * w + (w - 1);
  tiles[dock] = 'dock';
  const floorCells = (left: boolean) => tiles.flatMap((t, i) => (t === 'floor' && (left ? i % w < firstPit : i % w > lastPit) ? [i] : []));
  for (let k = 0; k < p.walls; k += 1) {
    const choices = tiles.flatMap((t, i) => (t === 'floor' && i !== dock ? [i] : []));
    tiles[rng.pick(choices)] = 'wall';
  }
  const gold = rng.pick(floorCells(true));
  const crates = [gold];
  for (let k = 0; k < p.crates; k += 1) {
    const c = rng.pick(tiles.flatMap((t, i) => (t === 'floor' && !crates.includes(i) && i !== dock ? [i] : [])));
    crates.push(c);
  }
  const platforms: Platform[] = [];
  const used = new Set<number>(crates);
  for (const [pw, ph] of p.platforms) {
    const spots: number[] = [];
    for (let r = 0; r + ph <= h; r += 1)
      for (let c = 0; c + pw <= w; c += 1) {
        const cells = platformCells(w, { at: r * w + c, w: pw, h: ph });
        if (cells.every((x) => tiles[x] !== 'wall' && !used.has(x))) spots.push(r * w + c);
      }
    if (!spots.length) return null;
    const at = rng.pick(spots);
    platforms.push({ at, w: pw, h: ph });
    platformCells(w, { at, w: pw, h: ph }).forEach((x) => used.add(x));
  }
  const board = { width: w, height: h, tiles };
  const start = { platforms, crates };
  const sol = solveEscape(board, start, 30_000);
  if (!sol || sol.length < p.par[0] || sol.length > p.par[1]) return null;
  // Extra crates must matter: they have to move in the shortest solution or be in the way.
  return { band, width: w, height: h, tiles, platforms, crates, par: sol.length, selected: null, moves: 0, history: [], start };
}

export function generateEscape(key: string, band: DifficultyBand, p: Profile = ESCAPE_PROFILES[band]): EscapeState {
  const rng = createRng(key);
  for (let i = 0; i < 400; i += 1) {
    const s = tryBuild(rng, band, p);
    if (s) return s;
  }
  throw new Error('No acceptable warehouse within the attempt budget');
}

export const ESCAPE_TUTORIALS = [
  { id: 'tutorial-1', difficulty: 'intro' as const, intro: 'The gold crate cannot walk over the pit. Step it onto the platform, slide the platform across, then step off to the dock.', profile: ESCAPE_PROFILES.intro },
  { id: 'tutorial-2', difficulty: 'easy' as const, intro: 'A crate standing on the floor blocks a platform. Move it out of the way first.', profile: ESCAPE_PROFILES.easy },
  { id: 'tutorial-3', difficulty: 'standard' as const, intro: 'Two platforms: line them up to make a longer bridge, or ferry in stages.', profile: ESCAPE_PROFILES.standard },
];

export const escapeFingerprint = (s: EscapeState) => fingerprint(JSON.stringify([s.width, s.tiles, s.start]));
export const pieceId = (p: Piece) => `${p.kind}-${p.index}`;

function toLevel(s: EscapeState, seed: string, difficulty: DifficultyBand, source: PuzzleLevel['source'], levelId: string): PuzzleLevel<EscapeState> {
  return { gameId: BLOCK_ESCAPE_ID, levelId, generatorVersion: BLOCK_ESCAPE_VERSION, seed, difficulty, source, fingerprint: escapeFingerprint(s), initialState: s, metadata: { size: `${s.width}x${s.height}`, par: s.par } };
}

export const blockEscape: GameModule<EscapeState, EscapeAction> = {
  id: BLOCK_ESCAPE_ID,
  version: BLOCK_ESCAPE_VERSION,
  createLevel(seed, difficulty) {
    const t = ESCAPE_TUTORIALS.find((x) => x.id === seed);
    if (t) return toLevel(generateEscape(levelSeedKey(BLOCK_ESCAPE_ID, BLOCK_ESCAPE_VERSION, seed), t.difficulty, t.profile), seed, t.difficulty, 'authored', `${BLOCK_ESCAPE_ID}:${seed}`);
    return toLevel(generateEscape(levelSeedKey(BLOCK_ESCAPE_ID, BLOCK_ESCAPE_VERSION, `${seed}/${difficulty}`), difficulty), seed, difficulty, 'generated', `${BLOCK_ESCAPE_ID}:${difficulty}:${seed}`);
  },
  fallbackLevel(difficulty) {
    return toLevel(generateEscape(levelSeedKey(BLOCK_ESCAPE_ID, BLOCK_ESCAPE_VERSION, `curated/${difficulty}`), difficulty), 'curated', difficulty, 'fallback', `${BLOCK_ESCAPE_ID}:fallback-${difficulty}`);
  },
  validateLevel(level): ValidationResult {
    if (level.gameId !== BLOCK_ESCAPE_ID) return { valid: false, reasonCode: 'wrong_game' };
    const s = level.initialState;
    if (s.tiles.length !== s.width * s.height || s.tiles.filter((t) => t === 'dock').length !== 1) return { valid: false, reasonCode: 'bad_board' };
    if (s.moves || s.history.length || JSON.stringify({ platforms: s.platforms, crates: s.crates }) !== JSON.stringify(s.start)) return { valid: false, reasonCode: 'bad_start' };
    if (atDock(s, s)) return { valid: false, reasonCode: 'already_solved' };
    const sol = solveEscape(s, s);
    if (!sol) return { valid: false, reasonCode: 'unsolvable' };
    if (sol.length !== s.par) return { valid: false, reasonCode: 'par_mismatch' };
    if (level.fingerprint !== escapeFingerprint(s)) return { valid: false, reasonCode: 'fingerprint_mismatch' };
    return { valid: true, solutionFingerprint: fingerprint(JSON.stringify(sol)) };
  },
  reduce(s, a) {
    if (atDock(s, s)) return s;
    switch (a.type) {
      case 'select': {
        const exists = a.piece.kind === 'crate' ? s.crates[a.piece.index] !== undefined : s.platforms[a.piece.index] !== undefined;
        if (!exists || (s.selected && pieceId(s.selected) === pieceId(a.piece))) return s;
        return { ...s, selected: a.piece };
      }
      case 'move': {
        if (!s.selected) return s;
        const n = tryMove(s, s, s.selected, a.dir);
        if (!n) return s;
        return { ...s, ...n, moves: s.moves + 1, history: [...s.history, { platforms: s.platforms, crates: s.crates }].slice(-100) };
      }
      case 'undo': {
        const last = s.history[s.history.length - 1];
        return last ? { ...s, ...last, history: s.history.slice(0, -1) } : s;
      }
      case 'reset':
        return s.history.length ? { ...s, ...s.start, history: [], selected: null } : s;
      default:
        return s;
    }
  },
  isComplete: (s) => atDock(s, s),
  score(s, { hintsUsed }) {
    const extra = s.moves - s.par;
    return 100 + Math.max(0, (extra <= 0 ? 50 : extra <= 3 ? 35 : extra <= 8 ? 20 : 10) - hintsUsed * 10);
  },
  hint(s, tier: HintTier): GameHint {
    const sol = solveEscape(s, s);
    if (!sol) return { tier, text: 'This position is stuck. Undo or reset.', highlightIds: [] };
    if (tier === 1) return { tier, text: `The dock is ${sol.length} move${sol.length === 1 ? '' : 's'} away.`, highlightIds: [] };
    const words = ['up', 'right', 'down', 'left'];
    const show = sol.slice(0, tier === 2 ? 1 : 2);
    return { tier, text: show.map((m, i) => `${i ? 'Then move' : 'Move'} the highlighted ${m.piece.kind} ${words[m.dir]}.`).join(' '), highlightIds: show.map((m) => pieceId(m.piece)) };
  },
};

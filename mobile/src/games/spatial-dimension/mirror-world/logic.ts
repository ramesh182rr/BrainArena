import type { DifficultyBand, GameHint, GameModule, HintTier, PuzzleLevel, ValidationResult } from '@/game-runtime/contracts';
import { createRng, fingerprint, levelSeedKey, type Rng } from '@/game-runtime/rng';

/**
 * Echo Rooms (W3-G05): dual-board coordination.
 *
 * One arrow moves two explorers in two rooms. The left explorer moves as
 * pressed; the right explorer receives a transformed move (mirrored, flipped,
 * rotated, or alternating). An explorer facing a wall stays put while the other
 * moves. Both must stand on their exits at the same time.
 */

export type Dir = 0 | 1 | 2 | 3; // up, right, down, left
export type Transform = 'mirror' | 'flip' | 'rotate' | 'alternate';

export interface MirrorState {
  band: DifficultyBand;
  width: number;
  height: number;
  wallsA: readonly boolean[];
  wallsB: readonly boolean[];
  startA: number;
  startB: number;
  exitA: number;
  exitB: number;
  transform: Transform;
  /** Positions after each move, starting with the start pair. */
  path: readonly (readonly [number, number])[];
  /** Whether each explorer bumped on the latest move. */
  lastBump: readonly [boolean, boolean] | null;
  par: number;
}

export type MirrorAction = { type: 'move'; dir: Dir } | { type: 'undo' } | { type: 'reset' };

export const MIRROR_WORLD_ID = 'W3-G05';
export const MIRROR_WORLD_VERSION = '1.0.0';
export const DIR_NAMES = ['up', 'right', 'down', 'left'] as const;

/** The direction the right-hand explorer receives for move number `moveIndex` (0-based). */
export function transformDir(t: Transform, d: Dir, moveIndex: number): Dir {
  const mirror = (x: Dir): Dir => (x === 1 ? 3 : x === 3 ? 1 : x);
  const flip = (x: Dir): Dir => (x === 0 ? 2 : x === 2 ? 0 : x);
  const rotate = (x: Dir): Dir => ((x + 1) % 4) as Dir;
  switch (t) {
    case 'mirror':
      return mirror(d);
    case 'flip':
      return flip(d);
    case 'rotate':
      return rotate(d);
    case 'alternate':
      return moveIndex % 2 === 0 ? mirror(d) : rotate(d);
  }
}

export const TRANSFORM_TEXT: Record<Transform, string> = {
  mirror: 'The right explorer moves mirrored: left and right swap.',
  flip: 'The right explorer moves flipped: up and down swap.',
  rotate: 'The right explorer turns every move a quarter clockwise: up becomes right.',
  alternate: 'The right explorer alternates: mirrored on odd moves, turned a quarter on even moves.',
};

function step(width: number, height: number, walls: readonly boolean[], pos: number, d: Dir): { pos: number; bumped: boolean } {
  const r = Math.floor(pos / width) + (d === 0 ? -1 : d === 2 ? 1 : 0);
  const c = (pos % width) + (d === 1 ? 1 : d === 3 ? -1 : 0);
  if (r < 0 || r >= height || c < 0 || c >= width || walls[r * width + c]) return { pos, bumped: true };
  return { pos: r * width + c, bumped: false };
}

export function moveBoth(s: Pick<MirrorState, 'width' | 'height' | 'wallsA' | 'wallsB' | 'transform'>, a: number, b: number, d: Dir, moveIndex: number) {
  const A = step(s.width, s.height, s.wallsA, a, d);
  const B = step(s.width, s.height, s.wallsB, b, transformDir(s.transform, d, moveIndex));
  return { a: A.pos, b: B.pos, bumps: [A.bumped, B.bumped] as [boolean, boolean] };
}

/** Breadth-first search over (a, b, move parity). Returns the shortest list of directions, or null. */
export function solveMirror(s: Omit<MirrorState, 'path' | 'lastBump' | 'par' | 'band'>, fromA: number, fromB: number, fromMove: number, limit = 40): Dir[] | null {
  if (fromA === s.exitA && fromB === s.exitB) return [];
  const parity = s.transform === 'alternate' ? 2 : 1;
  const key = (a: number, b: number, m: number) => `${a},${b},${m % parity}`;
  const seen = new Set([key(fromA, fromB, fromMove)]);
  let frontier = [{ a: fromA, b: fromB, m: fromMove, path: [] as Dir[] }];
  for (let depth = 0; depth < limit && frontier.length; depth += 1) {
    const next: typeof frontier = [];
    for (const n of frontier) {
      for (const d of [0, 1, 2, 3] as Dir[]) {
        const r = moveBoth(s, n.a, n.b, d, n.m);
        const k = key(r.a, r.b, n.m + 1);
        if (seen.has(k)) continue;
        seen.add(k);
        const path = [...n.path, d];
        if (r.a === s.exitA && r.b === s.exitB) return path;
        next.push({ a: r.a, b: r.b, m: n.m + 1, path });
      }
    }
    frontier = next;
  }
  return null;
}

interface Profile {
  size: number;
  transform: Transform;
  walls: number;
  par: readonly [number, number];
}

export const MIRROR_PROFILES: Readonly<Record<DifficultyBand, Profile>> = {
  intro: { size: 4, transform: 'mirror', walls: 3, par: [3, 6] },
  easy: { size: 5, transform: 'mirror', walls: 5, par: [4, 8] },
  standard: { size: 5, transform: 'flip', walls: 5, par: [5, 9] },
  advanced: { size: 5, transform: 'rotate', walls: 6, par: [6, 10] },
  expert: { size: 6, transform: 'alternate', walls: 8, par: [7, 12] },
};

export function assembleMirror(band: DifficultyBand, base: Omit<MirrorState, 'path' | 'lastBump' | 'par' | 'band'>, par: number): MirrorState {
  return { ...base, band, path: [[base.startA, base.startB]], lastBump: null, par };
}

function tryBuild(rng: Rng, band: DifficultyBand, p: Profile): MirrorState | null {
  const n = p.size * p.size;
  const room = () => {
    const walls = new Array<boolean>(n).fill(false);
    for (const i of rng.shuffle(Array.from({ length: n }, (_, k) => k)).slice(0, p.walls)) walls[i] = true;
    const free = Array.from({ length: n }, (_, k) => k).filter((k) => !walls[k]);
    const [start, exit] = rng.shuffle(free);
    return { walls, start: start!, exit: exit! };
  };
  const A = room();
  const B = room();
  const base = { width: p.size, height: p.size, wallsA: A.walls, wallsB: B.walls, startA: A.start, startB: B.start, exitA: A.exit, exitB: B.exit, transform: p.transform };
  const path = solveMirror(base, base.startA, base.startB, 0);
  if (!path || path.length < p.par[0] || path.length > p.par[1]) return null;
  // Interesting rooms need a deliberate bump: some move where exactly one explorer stays.
  let a = base.startA;
  let b = base.startB;
  let usesBump = false;
  path.forEach((d, i) => {
    const r = moveBoth(base, a, b, d, i);
    if (r.bumps[0] !== r.bumps[1]) usesBump = true;
    a = r.a;
    b = r.b;
  });
  return usesBump ? assembleMirror(band, base, path.length) : null;
}

export function generateMirror(key: string, band: DifficultyBand): MirrorState {
  const rng = createRng(key);
  for (let i = 0; i < 400; i += 1) {
    const s = tryBuild(rng, band, MIRROR_PROFILES[band]);
    if (s) return s;
  }
  throw new Error('No acceptable rooms within the attempt budget');
}

/** Authored rooms: `.` floor, `#` wall, `S` start, `E` exit. */
export function parseRooms(band: DifficultyBand, transform: Transform, roomA: readonly string[], roomB: readonly string[]): MirrorState {
  const parse = (rows: readonly string[]) => {
    const cells = rows.join('').split('');
    return { walls: cells.map((c) => c === '#'), start: cells.indexOf('S'), exit: cells.indexOf('E') };
  };
  const A = parse(roomA);
  const B = parse(roomB);
  const size = roomA[0]!.length;
  const base = { width: size, height: roomA.length, wallsA: A.walls, wallsB: B.walls, startA: A.start, startB: B.start, exitA: A.exit, exitB: B.exit, transform };
  return assembleMirror(band, base, solveMirror(base, A.start, B.start, 0)?.length ?? 0);
}

export const MIRROR_TUTORIALS = [
  {
    id: 'tutorial-1',
    difficulty: 'intro' as const,
    intro: 'One arrow moves both explorers, but the right room is a mirror: left and right swap. Get both onto their doors together.',
    make: () => parseRooms('intro', 'mirror', ['S...', '....', '....', '...E'], ['...S', '....', '....', 'E...']),
  },
  {
    id: 'tutorial-2',
    difficulty: 'easy' as const,
    intro: 'Walls let one explorer wait while the other moves. Use a bump to fall into step.',
    make: () => parseRooms('easy', 'mirror', ['S..#', '...#', '....', '..E.'], ['S...', '....', '....', '.E..']),
  },
  {
    id: 'tutorial-3',
    difficulty: 'advanced' as const,
    intro: 'Now the right explorer turns every move a quarter clockwise: up becomes right, right becomes down.',
    make: () => parseRooms('advanced', 'rotate', ['S...', '.#..', '....', '...E'], ['S...', '....', '..#.', '...E']),
  },
];

export const mirrorFingerprint = (s: MirrorState) =>
  fingerprint(JSON.stringify([s.width, s.height, s.wallsA, s.wallsB, s.startA, s.startB, s.exitA, s.exitB, s.transform]));
export const arrowId = (d: Dir) => `arrow-${DIR_NAMES[d]}`;

function toLevel(s: MirrorState, seed: string, difficulty: DifficultyBand, source: PuzzleLevel['source'], levelId: string): PuzzleLevel<MirrorState> {
  return { gameId: MIRROR_WORLD_ID, levelId, generatorVersion: MIRROR_WORLD_VERSION, seed, difficulty, source, fingerprint: mirrorFingerprint(s), initialState: s, metadata: { size: s.width, par: s.par } };
}

export const movesMade = (s: MirrorState) => s.path.length - 1;
const here = (s: MirrorState) => s.path[s.path.length - 1]!;

export const mirrorWorld: GameModule<MirrorState, MirrorAction> = {
  id: MIRROR_WORLD_ID,
  version: MIRROR_WORLD_VERSION,
  createLevel(seed, difficulty) {
    const t = MIRROR_TUTORIALS.find((x) => x.id === seed);
    if (t) return toLevel(t.make(), seed, t.difficulty, 'authored', `${MIRROR_WORLD_ID}:${seed}`);
    return toLevel(generateMirror(levelSeedKey(MIRROR_WORLD_ID, MIRROR_WORLD_VERSION, `${seed}/${difficulty}`), difficulty), seed, difficulty, 'generated', `${MIRROR_WORLD_ID}:${difficulty}:${seed}`);
  },
  fallbackLevel(difficulty) {
    const s = generateMirror(levelSeedKey(MIRROR_WORLD_ID, MIRROR_WORLD_VERSION, `curated/${difficulty}`), difficulty);
    return toLevel(s, 'curated', difficulty, 'fallback', `${MIRROR_WORLD_ID}:fallback-${difficulty}`);
  },
  validateLevel(level): ValidationResult {
    if (level.gameId !== MIRROR_WORLD_ID) return { valid: false, reasonCode: 'wrong_game' };
    const s = level.initialState;
    const n = s.width * s.height;
    if (s.wallsA.length !== n || s.wallsB.length !== n) return { valid: false, reasonCode: 'bad_rooms' };
    for (const [pos, walls] of [[s.startA, s.wallsA], [s.exitA, s.wallsA], [s.startB, s.wallsB], [s.exitB, s.wallsB]] as const) {
      if (!Number.isInteger(pos) || pos < 0 || pos >= n || walls[pos]) return { valid: false, reasonCode: 'bad_positions' };
    }
    if (s.path.length !== 1) return { valid: false, reasonCode: 'bad_start' };
    const path = solveMirror(s, s.startA, s.startB, 0);
    if (!path) return { valid: false, reasonCode: 'unsolvable' };
    if (path.length === 0) return { valid: false, reasonCode: 'already_solved' };
    if (path.length !== s.par) return { valid: false, reasonCode: 'par_mismatch' };
    if (level.fingerprint !== mirrorFingerprint(s)) return { valid: false, reasonCode: 'fingerprint_mismatch' };
    return { valid: true, solutionFingerprint: fingerprint(path.join('')) };
  },
  reduce(s, a) {
    const [pa, pb] = here(s);
    if (pa === s.exitA && pb === s.exitB) return s;
    switch (a.type) {
      case 'move': {
        if (![0, 1, 2, 3].includes(a.dir)) return s;
        const r = moveBoth(s, pa, pb, a.dir, movesMade(s));
        return { ...s, path: [...s.path, [r.a, r.b]], lastBump: r.bumps };
      }
      case 'undo':
        return s.path.length > 1 ? { ...s, path: s.path.slice(0, -1), lastBump: null } : s;
      case 'reset':
        return s.path.length > 1 ? { ...s, path: s.path.slice(0, 1), lastBump: null } : s;
      default:
        return s;
    }
  },
  isComplete: (s) => here(s)[0] === s.exitA && here(s)[1] === s.exitB,
  score(s, { hintsUsed }) {
    const extra = movesMade(s) - s.par;
    return 100 + Math.max(0, (extra <= 0 ? 50 : extra <= 2 ? 30 : 15) - hintsUsed * 10);
  },
  hint(s, tier: HintTier): GameHint {
    const [a, b] = here(s);
    const path = solveMirror(s, a, b, movesMade(s));
    if (!path || path.length === 0) return { tier, text: 'Both explorers are home.', highlightIds: [] };
    if (tier === 1) return { tier, text: `Both doors can be reached together in ${path.length} more move${path.length === 1 ? '' : 's'}. Look for a wall to bump against.`, highlightIds: [] };
    const next = path.slice(0, tier === 2 ? 1 : 3);
    return { tier, text: `Next: ${next.map((d) => DIR_NAMES[d]).join(', then ')}.`, highlightIds: [arrowId(next[0]!)] };
  },
};

import type { DifficultyBand, GameHint, GameModule, HintTier, PuzzleLevel, ValidationResult } from '@/game-runtime/contracts';
import { createRng, fingerprint, levelSeedKey, type Rng } from '@/game-runtime/rng';

/**
 * Shape Shift (W3-G04): projection matching.
 *
 * A small shape of cubes casts a front shadow (and, in expert, a side shadow).
 * Turn, tilt and roll the shape until its shadows match the targets.
 */

export type Cube = readonly [number, number, number];
export type Rotation = 'turn' | 'tilt' | 'roll';
export const ROTATIONS: readonly Rotation[] = ['turn', 'tilt', 'roll'];

export interface ShapeState {
  band: DifficultyBand;
  start: readonly Cube[];
  moves: readonly Rotation[];
  /** Target front shadow (x,y cells) and optional side shadow (z,y cells), normalised. */
  targetFront: readonly string[];
  targetSide: readonly string[] | null;
  par: number;
}

export type ShapeAction = { type: 'rotate'; rotation: Rotation } | { type: 'undo' } | { type: 'reset' };

export const SHAPE_SHIFT_ID = 'W3-G04';
export const SHAPE_SHIFT_VERSION = '1.0.0';

export function normalise(cubes: readonly Cube[]): Cube[] {
  const mx = Math.min(...cubes.map((c) => c[0]));
  const my = Math.min(...cubes.map((c) => c[1]));
  const mz = Math.min(...cubes.map((c) => c[2]));
  return cubes.map(([x, y, z]) => [x - mx, y - my, z - mz] as Cube).sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]);
}

export function rotate(cubes: readonly Cube[], r: Rotation): Cube[] {
  const f = (c: Cube): Cube => {
    const [x, y, z] = c;
    if (r === 'turn') return [z, y, -x];
    if (r === 'tilt') return [x, -z, y];
    return [-y, x, z];
  };
  return normalise(cubes.map(f));
}

const keyOf = (cubes: readonly Cube[]) => cubes.map((c) => c.join(',')).join(';');

function shadow(cubes: readonly Cube[], axisA: 0 | 2, axisB: 1): string[] {
  const cells = new Set(cubes.map((c) => `${c[axisA]},${c[axisB]}`));
  const pts = [...cells].map((k) => k.split(',').map(Number) as [number, number]);
  const ma = Math.min(...pts.map((p) => p[0]));
  const mb = Math.min(...pts.map((p) => p[1]));
  return pts.map(([a, b]) => `${a - ma},${b - mb}`).sort();
}

export const frontShadow = (cubes: readonly Cube[]) => shadow(cubes, 0, 1);
export const sideShadow = (cubes: readonly Cube[]) => shadow(cubes, 2, 1);

export function currentCubes(s: Pick<ShapeState, 'start' | 'moves'>): Cube[] {
  return s.moves.reduce<Cube[]>((c, m) => rotate(c, m), normalise(s.start));
}

export function matches(s: Pick<ShapeState, 'targetFront' | 'targetSide'>, cubes: readonly Cube[]): boolean {
  const same = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((v, i) => v === b[i]);
  return same(frontShadow(cubes), s.targetFront) && (s.targetSide === null || same(sideShadow(cubes), s.targetSide));
}

/** Shortest rotation sequence from `cubes` to a matching orientation (BFS over the 24 orientations). */
export function solveShape(s: Pick<ShapeState, 'targetFront' | 'targetSide'>, cubes: readonly Cube[]): Rotation[] | null {
  const start = normalise(cubes);
  if (matches(s, start)) return [];
  const seen = new Set([keyOf(start)]);
  let frontier: { c: Cube[]; path: Rotation[] }[] = [{ c: start, path: [] }];
  while (frontier.length) {
    const next: typeof frontier = [];
    for (const n of frontier) {
      for (const r of ROTATIONS) {
        const c = rotate(n.c, r);
        const k = keyOf(c);
        if (seen.has(k)) continue;
        seen.add(k);
        const path = [...n.path, r];
        if (matches(s, c)) return path;
        next.push({ c, path });
      }
    }
    frontier = next;
  }
  return null;
}

function randomShape(rng: Rng, count: number): Cube[] {
  const cubes: Cube[] = [[1, 1, 1]];
  const has = (c: Cube) => cubes.some((d) => d[0] === c[0] && d[1] === c[1] && d[2] === c[2]);
  while (cubes.length < count) {
    const base = rng.pick(cubes);
    const axis = rng.int(0, 2);
    const delta = rng.chance(0.5) ? 1 : -1;
    const c = [...base] as [number, number, number];
    c[axis] = c[axis]! + delta;
    if (c.some((v) => v < 0 || v > 2) || has(c)) continue;
    cubes.push(c);
  }
  return normalise(cubes);
}

interface Profile {
  cubes: readonly [number, number];
  side: boolean;
  par: readonly [number, number];
}

export const SHAPE_PROFILES: Readonly<Record<DifficultyBand, Profile>> = {
  intro: { cubes: [3, 3], side: false, par: [1, 2] },
  easy: { cubes: [4, 4], side: false, par: [2, 3] },
  standard: { cubes: [4, 5], side: false, par: [2, 4] },
  advanced: { cubes: [5, 6], side: false, par: [3, 5] },
  expert: { cubes: [4, 5], side: true, par: [3, 5] },
};

function tryBuild(rng: Rng, band: DifficultyBand, p: Profile): ShapeState | null {
  const shape = randomShape(rng, rng.int(p.cubes[0], p.cubes[1]));
  let target = shape;
  for (let k = rng.int(2, 6); k > 0; k -= 1) target = rotate(target, rng.pick(ROTATIONS));
  const s = { targetFront: frontShadow(target), targetSide: p.side ? sideShadow(target) : null };
  const path = solveShape(s, shape);
  if (!path || path.length < p.par[0] || path.length > p.par[1]) return null;
  return { band, start: shape, moves: [], ...s, par: path.length };
}

export function generateShape(key: string, band: DifficultyBand): ShapeState {
  const rng = createRng(key);
  for (let i = 0; i < 400; i += 1) {
    const s = tryBuild(rng, band, SHAPE_PROFILES[band]);
    if (s) return s;
  }
  throw new Error('No acceptable shape within the attempt budget');
}

export const SHAPE_TUTORIALS = [
  { id: 'tutorial-1', difficulty: 'intro' as const, intro: 'Turn, tilt or roll the shape until its shadow matches the target shadow.' },
  { id: 'tutorial-2', difficulty: 'standard' as const, intro: 'Bigger shapes can cast the same shadow in more than one way. Watch the shadow, not the shape.' },
  { id: 'tutorial-3', difficulty: 'expert' as const, intro: 'Now two shadows must match at once: the front one and the side one.' },
];

export const shapeFingerprint = (s: ShapeState) => fingerprint(JSON.stringify([s.start, s.targetFront, s.targetSide]));
export const rotationId = (r: Rotation) => `rotate-${r}`;

function toLevel(s: ShapeState, seed: string, difficulty: DifficultyBand, source: PuzzleLevel['source'], levelId: string): PuzzleLevel<ShapeState> {
  return { gameId: SHAPE_SHIFT_ID, levelId, generatorVersion: SHAPE_SHIFT_VERSION, seed, difficulty, source, fingerprint: shapeFingerprint(s), initialState: s, metadata: { cubes: s.start.length, par: s.par } };
}

export const shapeShift: GameModule<ShapeState, ShapeAction> = {
  id: SHAPE_SHIFT_ID,
  version: SHAPE_SHIFT_VERSION,
  createLevel(seed, difficulty) {
    const t = SHAPE_TUTORIALS.find((x) => x.id === seed);
    const band = t ? t.difficulty : difficulty;
    return toLevel(generateShape(levelSeedKey(SHAPE_SHIFT_ID, SHAPE_SHIFT_VERSION, `${seed}/${band}`), band), seed, band, t ? 'authored' : 'generated', `${SHAPE_SHIFT_ID}:${t ? seed : `${band}:${seed}`}`);
  },
  fallbackLevel(difficulty) {
    return toLevel(generateShape(levelSeedKey(SHAPE_SHIFT_ID, SHAPE_SHIFT_VERSION, `curated/${difficulty}`), difficulty), 'curated', difficulty, 'fallback', `${SHAPE_SHIFT_ID}:fallback-${difficulty}`);
  },
  validateLevel(level): ValidationResult {
    if (level.gameId !== SHAPE_SHIFT_ID) return { valid: false, reasonCode: 'wrong_game' };
    const s = level.initialState;
    if (s.start.length < 2 || s.start.length > 8) return { valid: false, reasonCode: 'bad_shape' };
    if (s.moves.length) return { valid: false, reasonCode: 'bad_start' };
    const path = solveShape(s, s.start);
    if (!path) return { valid: false, reasonCode: 'unsolvable' };
    if (path.length === 0) return { valid: false, reasonCode: 'already_solved' };
    if (path.length !== s.par) return { valid: false, reasonCode: 'par_mismatch' };
    if (level.fingerprint !== shapeFingerprint(s)) return { valid: false, reasonCode: 'fingerprint_mismatch' };
    return { valid: true, solutionFingerprint: fingerprint(path.join()) };
  },
  reduce(s, a) {
    if (matches(s, currentCubes(s))) return s;
    switch (a.type) {
      case 'rotate':
        return ROTATIONS.includes(a.rotation) ? { ...s, moves: [...s.moves, a.rotation] } : s;
      case 'undo':
        return s.moves.length ? { ...s, moves: s.moves.slice(0, -1) } : s;
      case 'reset':
        return s.moves.length ? { ...s, moves: [] } : s;
      default:
        return s;
    }
  },
  isComplete: (s) => matches(s, currentCubes(s)),
  score(s, { hintsUsed }) {
    const extra = s.moves.length - s.par;
    return 100 + Math.max(0, (extra <= 0 ? 50 : extra <= 2 ? 30 : 15) - hintsUsed * 10);
  },
  hint(s, tier: HintTier): GameHint {
    const path = solveShape(s, currentCubes(s));
    if (!path || path.length === 0) return { tier, text: 'The shadows already match.', highlightIds: [] };
    if (tier === 1) return { tier, text: `${path.length} more rotation${path.length === 1 ? '' : 's'} will do it. Compare the widest row of each shadow.`, highlightIds: [] };
    const next = path.slice(0, tier === 2 ? 1 : 2);
    return { tier, text: `Try: ${next.join(', then ')}.`, highlightIds: [rotationId(next[0]!)] };
  },
};

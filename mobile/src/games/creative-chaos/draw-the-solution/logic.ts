import type { DifficultyBand, GameHint, GameModule, HintTier, PuzzleLevel, ValidationResult } from '@/game-runtime/contracts';
import { createRng, fingerprint, levelSeedKey, type Rng } from '@/game-runtime/rng';

/**
 * Draw the Solution (W6-G02): stroke engineering on a grid.
 *
 * A ball drops from a chute, falls and rolls. Draw one continuous stroke from
 * an anchor peg (tap squares one after another), choosing plank (solid) or
 * spring (bounces the ball up two squares as it lands). Then drop the ball.
 * Ink is limited. Every level is checked by trying every possible stroke.
 */

export type Material = 'plank' | 'spring';
export type Cell = 'air' | 'wall' | 'anchor' | 'basket';

export interface DrawState {
  band: DifficultyBand;
  width: number;
  height: number;
  cells: readonly Cell[];
  start: number;
  startDir: 1 | -1;
  ink: number;
  materials: readonly Material[];
  minInk: number;
  stroke: number[];
  material: Material;
  drops: number;
  lastRun: { path: number[]; outcome: 'basket' | 'lost' | 'stuck' } | null;
}

export type DrawAction = { type: 'draw'; cell: number } | { type: 'material'; material: Material } | { type: 'drop' } | { type: 'clear' };

export const DRAW_ID = 'W6-G02';
export const DRAW_VERSION = '1.0.0';

const solidCell = (c: Cell) => c === 'wall' || c === 'anchor';

export function simulate(s: Pick<DrawState, 'width' | 'height' | 'cells' | 'start' | 'startDir'>, stroke: readonly number[], material: Material): { path: number[]; outcome: 'basket' | 'lost' | 'stuck' } {
  const w = s.width;
  const drawn = new Set(stroke);
  const solid = (i: number) => solidCell(s.cells[i]!) || drawn.has(i);
  const inside = (r: number, c: number) => r >= 0 && r < s.height && c >= 0 && c < w;
  let r = Math.floor(s.start / w);
  let c = s.start % w;
  let dir = s.startDir;
  let falling = true;
  const path = [s.start];
  const seen = new Set<string>();
  for (let t = 0; t < 80; t += 1) {
    const here = r * w + c;
    if (s.cells[here] === 'basket') return { path, outcome: 'basket' };
    const key = `${here},${dir},${falling}`;
    if (seen.has(key)) return { path, outcome: 'stuck' };
    seen.add(key);
    if (r + 1 >= s.height) return { path, outcome: 'lost' };
    const below = (r + 1) * w + c;
    if (!solid(below)) {
      r += 1;
      falling = true;
    } else if (falling && material === 'spring' && drawn.has(below)) {
      // Spring: pop up to two squares, then carry on sideways.
      let up = 0;
      while (up < 2 && inside(r - 1, c) && !solid((r - 1) * w + c)) {
        r -= 1;
        up += 1;
        path.push(r * w + c);
      }
      falling = false;
      if (inside(r, c + dir) && !solid(r * w + c + dir)) c += dir;
      else if (inside(r, c - dir) && !solid(r * w + c - dir)) {
        dir = dir === 1 ? -1 : 1;
        c += dir;
      } else return { path, outcome: 'stuck' };
    } else {
      falling = false;
      if (!inside(r, c + dir)) return { path, outcome: 'lost' };
      if (!solid(r * w + c + dir)) c += dir;
      else if (inside(r, c - dir) && !solid(r * w + c - dir)) {
        dir = dir === 1 ? -1 : 1;
        c += dir;
      } else return { path, outcome: 'stuck' };
    }
    path.push(r * w + c);
  }
  return { path, outcome: 'stuck' };
}

function neighbours(w: number, h: number, i: number): number[] {
  const r = Math.floor(i / w);
  const c = i % w;
  return [r > 0 ? i - w : -1, c < w - 1 ? i + 1 : -1, r < h - 1 ? i + w : -1, c > 0 ? i - 1 : -1].filter((x) => x >= 0);
}

/** A stroke must begin on a square touching an anchor peg and continue square by square through air. */
export function canExtend(s: Pick<DrawState, 'width' | 'height' | 'cells' | 'start' | 'ink'>, stroke: readonly number[], cell: number): boolean {
  if (stroke.length >= s.ink || stroke.includes(cell) || s.cells[cell] !== 'air' || cell === s.start) return false;
  if (!stroke.length) return neighbours(s.width, s.height, cell).some((n) => s.cells[n] === 'anchor');
  return neighbours(s.width, s.height, stroke[stroke.length - 1]!).includes(cell);
}

/** Shortest working stroke (fewest squares) for any allowed material, or null. */
export function solveDraw(s: Pick<DrawState, 'width' | 'height' | 'cells' | 'start' | 'startDir' | 'ink' | 'materials'>): { stroke: number[]; material: Material } | null {
  for (let len = 1; len <= s.ink; len += 1) {
    for (const material of s.materials) {
      const stroke: number[] = [];
      let found: number[] | null = null;
      const go = () => {
        if (found) return;
        if (stroke.length === len) {
          if (simulate(s, stroke, material).outcome === 'basket') found = [...stroke];
          return;
        }
        const options = stroke.length ? neighbours(s.width, s.height, stroke[stroke.length - 1]!) : s.cells.flatMap((_, i) => [i]);
        for (const n of options) {
          if (!canExtend(s, stroke, n)) continue;
          stroke.push(n);
          go();
          stroke.pop();
        }
      };
      go();
      if (found) return { stroke: found, material };
    }
  }
  return null;
}

interface Profile {
  width: number;
  height: number;
  ink: number;
  materials: readonly Material[];
  walls: number;
  anchors: number;
  minInk: number;
}

export const DRAW_PROFILES: Readonly<Record<DifficultyBand, Profile>> = {
  intro: { width: 6, height: 6, ink: 3, materials: ['plank'], walls: 3, anchors: 1, minInk: 1 },
  easy: { width: 6, height: 7, ink: 4, materials: ['plank'], walls: 5, anchors: 2, minInk: 2 },
  standard: { width: 7, height: 7, ink: 4, materials: ['plank', 'spring'], walls: 6, anchors: 2, minInk: 2 },
  advanced: { width: 7, height: 8, ink: 5, materials: ['plank', 'spring'], walls: 8, anchors: 2, minInk: 3 },
  expert: { width: 8, height: 8, ink: 5, materials: ['plank', 'spring'], walls: 10, anchors: 3, minInk: 3 },
};

function tryBuild(rng: Rng, band: DifficultyBand, p: Profile): DrawState | null {
  const { width: w, height: h } = p;
  const cells: Cell[] = Array.from({ length: w * h }, () => 'air');
  // A floor with gaps, and some ledges.
  for (let c = 0; c < w; c += 1) if (rng.chance(0.6)) cells[(h - 1) * w + c] = 'wall';
  const free = (rows: [number, number]) => rng.pick(cells.flatMap((x, i) => (x === 'air' && Math.floor(i / w) >= rows[0] && Math.floor(i / w) <= rows[1] ? [i] : [])));
  for (let k = 0; k < p.walls; k += 1) cells[free([2, h - 2])] = 'wall';
  for (let k = 0; k < p.anchors; k += 1) cells[free([1, h - 2])] = 'anchor';
  const basket = free([Math.floor(h / 2), h - 1]);
  cells[basket] = 'basket';
  const start = rng.int(0, w - 1);
  if (cells[start] !== 'air') return null;
  const startDir = rng.chance(0.5) ? 1 : -1;
  const base = { width: w, height: h, cells, start, startDir: startDir as 1 | -1, ink: p.ink, materials: p.materials };
  if (simulate(base, [], 'plank').outcome === 'basket') return null;
  const sol = solveDraw(base);
  if (!sol || sol.stroke.length < p.minInk) return null;
  return { band, ...base, minInk: sol.stroke.length, stroke: [], material: 'plank', drops: 0, lastRun: null };
}

export function generateDraw(key: string, band: DifficultyBand, p: Profile = DRAW_PROFILES[band]): DrawState {
  const rng = createRng(key);
  for (let i = 0; i < 4000; i += 1) {
    const s = tryBuild(rng, band, p);
    if (s) return s;
  }
  throw new Error('No acceptable contraption within the attempt budget');
}

export const DRAW_TUTORIALS = [
  { id: 'tutorial-1', difficulty: 'intro' as const, intro: 'Draw a plank from the anchor peg: tap the square next to the peg, then keep tapping neighbouring squares. Then drop the ball.', profile: DRAW_PROFILES.intro },
  { id: 'tutorial-2', difficulty: 'easy' as const, intro: 'The ball rolls along planks and turns back at walls. Use as little ink as you can.', profile: DRAW_PROFILES.easy },
  { id: 'tutorial-3', difficulty: 'standard' as const, intro: 'Springs bounce a falling ball up two squares. Switch material before you drop.', profile: DRAW_PROFILES.standard },
];

export const drawFingerprint = (s: DrawState) => fingerprint(JSON.stringify([s.width, s.cells, s.start, s.startDir, s.ink, s.materials]));
export const squareId = (i: number) => `square-${i}`;

function toLevel(s: DrawState, seed: string, difficulty: DifficultyBand, source: PuzzleLevel['source'], levelId: string): PuzzleLevel<DrawState> {
  return { gameId: DRAW_ID, levelId, generatorVersion: DRAW_VERSION, seed, difficulty, source, fingerprint: drawFingerprint(s), initialState: s, metadata: { ink: s.ink, minInk: s.minInk } };
}

export const drawTheSolution: GameModule<DrawState, DrawAction> = {
  id: DRAW_ID,
  version: DRAW_VERSION,
  createLevel(seed, difficulty) {
    const t = DRAW_TUTORIALS.find((x) => x.id === seed);
    if (t) return toLevel(generateDraw(levelSeedKey(DRAW_ID, DRAW_VERSION, seed), t.difficulty, t.profile), seed, t.difficulty, 'authored', `${DRAW_ID}:${seed}`);
    return toLevel(generateDraw(levelSeedKey(DRAW_ID, DRAW_VERSION, `${seed}/${difficulty}`), difficulty), seed, difficulty, 'generated', `${DRAW_ID}:${difficulty}:${seed}`);
  },
  fallbackLevel(difficulty) {
    return toLevel(generateDraw(levelSeedKey(DRAW_ID, DRAW_VERSION, `curated/${difficulty}`), difficulty), 'curated', difficulty, 'fallback', `${DRAW_ID}:fallback-${difficulty}`);
  },
  validateLevel(level): ValidationResult {
    if (level.gameId !== DRAW_ID) return { valid: false, reasonCode: 'wrong_game' };
    const s = level.initialState;
    if (s.cells.length !== s.width * s.height || s.cells.filter((c) => c === 'basket').length !== 1 || !s.cells.includes('anchor')) return { valid: false, reasonCode: 'bad_board' };
    if (s.stroke.length || s.drops || s.lastRun) return { valid: false, reasonCode: 'bad_start' };
    if (simulate(s, [], 'plank').outcome === 'basket') return { valid: false, reasonCode: 'already_solved' };
    const sol = solveDraw(s);
    if (!sol) return { valid: false, reasonCode: 'unsolvable' };
    if (sol.stroke.length !== s.minInk) return { valid: false, reasonCode: 'ink_mismatch' };
    if (level.fingerprint !== drawFingerprint(s)) return { valid: false, reasonCode: 'fingerprint_mismatch' };
    return { valid: true, solutionFingerprint: fingerprint(`${sol.material}:${sol.stroke.join(',')}`) };
  },
  reduce(s, a) {
    if (s.lastRun?.outcome === 'basket') return s;
    switch (a.type) {
      case 'draw': {
        // Tapping the last square of the stroke erases it.
        if (s.stroke[s.stroke.length - 1] === a.cell) return { ...s, stroke: s.stroke.slice(0, -1), lastRun: null };
        if (!canExtend(s, s.stroke, a.cell)) return s;
        return { ...s, stroke: [...s.stroke, a.cell], lastRun: null };
      }
      case 'material':
        return s.materials.includes(a.material) && a.material !== s.material ? { ...s, material: a.material, lastRun: null } : s;
      case 'drop':
        return { ...s, drops: s.drops + 1, lastRun: simulate(s, s.stroke, s.material) };
      case 'clear':
        return s.stroke.length ? { ...s, stroke: [], lastRun: null } : s;
      default:
        return s;
    }
  },
  isComplete: (s) => s.lastRun?.outcome === 'basket',
  score(s, { hintsUsed }) {
    const extraInk = Math.max(0, s.stroke.length - s.minInk);
    return 100 + Math.max(0, 50 - extraInk * 8 - Math.max(0, s.drops - 1) * 6 - hintsUsed * 10);
  },
  hint(s, tier: HintTier): GameHint {
    const sol = solveDraw(s)!;
    if (tier === 1) return { tier, text: `It can be done with ${sol.stroke.length} square${sol.stroke.length === 1 ? '' : 's'} of ${sol.material}.`, highlightIds: [] };
    const show = sol.stroke.slice(0, tier === 2 ? 1 : 2);
    return { tier, text: tier === 2 ? 'Start your stroke on the highlighted square.' : 'Draw through the highlighted squares first.', highlightIds: show.map(squareId) };
  },
};

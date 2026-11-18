import type { DifficultyBand, GameHint, GameModule, HintTier, PuzzleLevel, ValidationResult } from '@/game-runtime/contracts';
import { createRng, fingerprint, levelSeedKey, type Rng } from '@/game-runtime/rng';

/**
 * Gravity Lab (W6-G01): force-field tinkering.
 *
 * An orb drifts one square per tick. As it slips past the corner of an
 * attractor it swings round towards it; as it nears the corner of a repulsor
 * it veers away (a strong attractor reaches one square further). Each device
 * bends the orb once. If devices disagree the orb keeps straight. Walls and
 * devices stop it. Place devices so the orb passes every gate, then reaches the exit.
 */

export type Dir = 0 | 1 | 2 | 3;
export type DeviceKind = 'attract' | 'repel' | 'strongAttract';
export type LabCell = { t: 'empty' } | { t: 'wall' } | { t: 'gate'; n: number } | { t: 'exit' } | { t: 'fixed'; kind: DeviceKind };

export type Outcome = 'exit' | 'crash' | 'loop' | 'lost';
export interface Run {
  path: number[];
  outcome: Outcome;
  gates: number[];
}

export interface GravityState {
  band: DifficultyBand;
  width: number;
  height: number;
  cells: readonly LabCell[];
  start: number;
  startDir: Dir;
  inventory: readonly DeviceKind[];
  placed: readonly (DeviceKind | null)[];
  launches: number;
  lastRun: Run | null;
}

export type GravityAction = { type: 'cycle'; cell: number } | { type: 'launch' } | { type: 'clear' };

export const GRAVITY_LAB_ID = 'W6-G01';
export const GRAVITY_LAB_VERSION = '1.0.0';
const MAX_TICKS = 80;

function move(w: number, h: number, i: number, d: Dir, steps = 1): number | null {
  const r = Math.floor(i / w) + (d === 0 ? -steps : d === 2 ? steps : 0);
  const c = (i % w) + (d === 1 ? steps : d === 3 ? -steps : 0);
  return r < 0 || r >= h || c < 0 || c >= w ? null : r * w + c;
}

const opposite = (d: Dir) => ((d + 2) % 4) as Dir;
const reach = (k: DeviceKind) => (k === 'strongAttract' ? 2 : 1);
const pulls = (k: DeviceKind) => k !== 'repel';

/** Every device on the board, fixed or placed. */
export function devicesOf(s: Pick<GravityState, 'cells' | 'placed'>): Map<number, DeviceKind> {
  const m = new Map<number, DeviceKind>();
  s.cells.forEach((c, i) => {
    if (c.t === 'fixed') m.set(i, c.kind);
    const p = s.placed[i];
    if (p) m.set(i, p);
  });
  return m;
}

export function simulate(s: Pick<GravityState, 'width' | 'height' | 'cells' | 'start' | 'startDir' | 'placed'>): Run {
  const { width: w, height: h, cells } = s;
  const devices = devicesOf(s);
  const totalGates = cells.filter((c) => c.t === 'gate').length;
  let pos = s.start;
  let dir = s.startDir;
  const path = [pos];
  const gates = new Set<number>();
  const seen = new Set<string>();
  const used = new Set<number>();
  for (let tick = 0; tick < MAX_TICKS; tick += 1) {
    // Attractors swing the orb round as it passes their corner; repulsors push it away as it nears one.
    const wanted = new Map<Dir, number>();
    for (const side of [((dir + 1) % 4) as Dir, ((dir + 3) % 4) as Dir]) {
      for (const [k, ahead] of [[1, false], [2, false], [1, true]] as const) {
        const a = move(w, h, pos, side, k);
        const c = a === null ? null : move(w, h, a, ahead ? dir : opposite(dir));
        if (c === null || used.has(c)) continue;
        const dev = devices.get(c);
        if (!dev || reach(dev) < k) continue;
        if (ahead && dev === 'repel') wanted.set(opposite(side), c);
        if (!ahead && pulls(dev)) wanted.set(side, c);
      }
    }
    if (wanted.size === 1) {
      const [d, c] = [...wanted][0]!;
      dir = d;
      used.add(c);
    } else for (const c of wanted.values()) used.add(c);
    const next = move(w, h, pos, dir);
    if (next === null) return { path, outcome: 'lost', gates: [...gates] };
    if (cells[next]!.t === 'wall' || devices.has(next)) return { path, outcome: 'crash', gates: [...gates] };
    pos = next;
    path.push(pos);
    const cell = cells[pos]!;
    if (cell.t === 'gate') gates.add(pos);
    if (cell.t === 'exit' && gates.size === totalGates) return { path, outcome: 'exit', gates: [...gates] };
    const key = `${pos},${dir},${gates.size},${used.size}`;
    if (seen.has(key)) return { path, outcome: 'loop', gates: [...gates] };
    seen.add(key);
  }
  return { path, outcome: 'loop', gates: [...gates] };
}

/** Free squares where a device may be placed. */
export function placeable(s: Pick<GravityState, 'cells' | 'start'>): number[] {
  return s.cells.flatMap((c, i) => (c.t === 'empty' && i !== s.start ? [i] : []));
}

/** Search all placements (each inventory device may also stay unused). Returns one solution with fewest devices. */
export function solveLab(s: Omit<GravityState, 'placed' | 'launches' | 'lastRun' | 'band'>, budget = 400_000): (DeviceKind | null)[] | null {
  const spots = placeable(s);
  const placed: (DeviceKind | null)[] = s.cells.map(() => null);
  let best: (DeviceKind | null)[] | null = null;
  let bestCount = Infinity;
  let nodes = 0;
  const go = (k: number, used: number, from: number) => {
    if (nodes++ > budget || used >= bestCount) return;
    if (simulate({ ...s, placed }).outcome === 'exit') {
      best = [...placed];
      bestCount = used;
      return;
    }
    if (k >= s.inventory.length) return;
    // Skip this device, or place it on a later square (equal kinds are placed in increasing order).
    go(k + 1, used, k + 1 < s.inventory.length && s.inventory[k + 1] === s.inventory[k] ? from : 0);
    for (let j = from; j < spots.length; j += 1) {
      placed[spots[j]!] = s.inventory[k]!;
      go(k + 1, used + 1, k + 1 < s.inventory.length && s.inventory[k + 1] === s.inventory[k] ? j + 1 : 0);
      placed[spots[j]!] = null;
    }
  };
  go(0, 0, 0);
  return best;
}

interface Profile {
  size: number;
  walls: number;
  gates: number;
  fixed: number;
  inventory: readonly DeviceKind[];
  minPath: number;
}

export const LAB_PROFILES: Readonly<Record<DifficultyBand, Profile>> = {
  intro: { size: 5, walls: 2, gates: 0, fixed: 0, inventory: ['attract'], minPath: 4 },
  easy: { size: 6, walls: 4, gates: 1, fixed: 0, inventory: ['attract', 'repel'], minPath: 6 },
  standard: { size: 6, walls: 6, gates: 1, fixed: 0, inventory: ['attract', 'repel'], minPath: 7 },
  advanced: { size: 7, walls: 6, gates: 2, fixed: 1, inventory: ['attract', 'repel'], minPath: 8 },
  expert: { size: 7, walls: 7, gates: 2, fixed: 1, inventory: ['attract', 'repel', 'strongAttract'], minPath: 9 },
};

export function assembleLab(band: DifficultyBand, base: Omit<GravityState, 'placed' | 'launches' | 'lastRun' | 'band'>): GravityState {
  return { ...base, band, placed: base.cells.map(() => null), launches: 0, lastRun: null };
}

function tryBuild(rng: Rng, band: DifficultyBand, p: Profile): GravityState | null {
  const size = p.size;
  const n = size * size;
  const cells: LabCell[] = Array.from({ length: n }, () => ({ t: 'empty' }));
  const free = () => rng.pick(cells.flatMap((c, i) => (c.t === 'empty' ? [i] : [])));
  for (let k = 0; k < p.walls; k += 1) cells[free()] = { t: 'wall' };
  for (let k = 0; k < p.fixed; k += 1) cells[free()] = { t: 'fixed', kind: rng.pick(['attract', 'repel'] as const) };
  const start = free();
  const startDir = rng.int(0, 3) as Dir;
  // Hidden solution: every inventory device on a random free square.
  const placed: (DeviceKind | null)[] = cells.map(() => null);
  for (const kind of p.inventory) {
    const spot = rng.pick(placeable({ cells, start }).filter((i) => !placed[i]));
    placed[spot] = kind;
  }
  const run = simulate({ width: size, height: size, cells, start, startDir, placed });
  const path = run.path;
  if (path.length < p.minPath + 1) return null;
  // The path must bend: devices must matter.
  const straight = simulate({ width: size, height: size, cells, start, startDir, placed: cells.map(() => null) }).path;
  if (straight.slice(0, path.length).join() === path.join()) return null;
  const end = rng.int(p.minPath, path.length - 1);
  const exit = path[end]!;
  if (exit === start || path.slice(0, end).includes(exit)) return null;
  cells[exit] = { t: 'exit' };
  const middle = [...new Set(path.slice(1, end))].filter((i) => i !== start && cells[i]!.t === 'empty');
  if (middle.length < p.gates) return null;
  rng.shuffle(middle).slice(0, p.gates).forEach((i, k) => (cells[i] = { t: 'gate', n: k + 1 }));
  const base = { width: size, height: size, cells, start, startDir, inventory: p.inventory };
  if (simulate({ ...base, placed }).outcome !== 'exit') return null;
  if (simulate({ ...base, placed: cells.map(() => null) }).outcome === 'exit') return null;
  if (!solveLab(base)) return null;
  return assembleLab(band, base);
}

export function generateLab(key: string, band: DifficultyBand): GravityState {
  const rng = createRng(key);
  for (let i = 0; i < 3000; i += 1) {
    const s = tryBuild(rng, band, LAB_PROFILES[band]);
    if (s) return s;
  }
  throw new Error('No acceptable lab within the attempt budget');
}

export const GRAVITY_TUTORIALS = [
  { id: 'tutorial-1', difficulty: 'intro' as const, intro: 'The orb drifts in a straight line. Place the attractor just beside its path: as the orb passes, it swings round towards it. Then Launch.' },
  { id: 'tutorial-2', difficulty: 'easy' as const, intro: 'Repulsors push the orb away. The orb must pass through the numbered gate before the exit opens.' },
  { id: 'tutorial-3', difficulty: 'expert' as const, intro: 'A strong attractor (double ring) reaches one square further than a normal one.' },
];

export const labFingerprint = (s: GravityState) => fingerprint(JSON.stringify([s.width, s.cells, s.start, s.startDir, s.inventory]));
export const squareId = (i: number) => `square-${i}`;

function toLevel(s: GravityState, seed: string, difficulty: DifficultyBand, source: PuzzleLevel['source'], levelId: string): PuzzleLevel<GravityState> {
  return { gameId: GRAVITY_LAB_ID, levelId, generatorVersion: GRAVITY_LAB_VERSION, seed, difficulty, source, fingerprint: labFingerprint(s), initialState: s, metadata: { size: s.width, devices: s.inventory.length } };
}

export function remaining(s: GravityState): Map<DeviceKind, number> {
  const m = new Map<DeviceKind, number>();
  for (const k of s.inventory) m.set(k, (m.get(k) ?? 0) + 1);
  for (const p of s.placed) if (p) m.set(p, (m.get(p) ?? 0) - 1);
  return m;
}

export const gravityLab: GameModule<GravityState, GravityAction> = {
  id: GRAVITY_LAB_ID,
  version: GRAVITY_LAB_VERSION,
  createLevel(seed, difficulty) {
    const t = GRAVITY_TUTORIALS.find((x) => x.id === seed);
    const band = t ? t.difficulty : difficulty;
    return toLevel(generateLab(levelSeedKey(GRAVITY_LAB_ID, GRAVITY_LAB_VERSION, `${seed}/${band}`), band), seed, band, t ? 'authored' : 'generated', `${GRAVITY_LAB_ID}:${t ? seed : `${band}:${seed}`}`);
  },
  fallbackLevel(difficulty) {
    return toLevel(generateLab(levelSeedKey(GRAVITY_LAB_ID, GRAVITY_LAB_VERSION, `curated/${difficulty}`), difficulty), 'curated', difficulty, 'fallback', `${GRAVITY_LAB_ID}:fallback-${difficulty}`);
  },
  validateLevel(level): ValidationResult {
    if (level.gameId !== GRAVITY_LAB_ID) return { valid: false, reasonCode: 'wrong_game' };
    const s = level.initialState;
    if (s.cells.length !== s.width * s.height || s.cells.filter((c) => c.t === 'exit').length !== 1) return { valid: false, reasonCode: 'bad_board' };
    if (s.cells[s.start]?.t !== 'empty') return { valid: false, reasonCode: 'bad_start' };
    if (s.placed.some(Boolean) || s.launches) return { valid: false, reasonCode: 'bad_start' };
    if (simulate(s).outcome === 'exit') return { valid: false, reasonCode: 'already_solved' };
    const sol = solveLab(s);
    if (!sol) return { valid: false, reasonCode: 'unsolvable' };
    if (level.fingerprint !== labFingerprint(s)) return { valid: false, reasonCode: 'fingerprint_mismatch' };
    return { valid: true, solutionFingerprint: fingerprint(JSON.stringify(sol)) };
  },
  reduce(s, a) {
    if (s.lastRun?.outcome === 'exit') return s;
    switch (a.type) {
      case 'cycle': {
        if (!placeable(s).includes(a.cell)) return s;
        // Cycle the square through the kinds still in stock, then back to empty.
        const order: DeviceKind[] = [...new Set(s.inventory)];
        const current = s.placed[a.cell] ?? null;
        const left = remaining(s);
        if (current) left.set(current, (left.get(current) ?? 0) + 1);
        const startAt = current ? order.indexOf(current) + 1 : 0;
        const next = order.slice(startAt).find((k) => (left.get(k) ?? 0) > 0) ?? null;
        if (next === current) return s;
        const placed = [...s.placed];
        placed[a.cell] = next;
        return { ...s, placed, lastRun: null };
      }
      case 'launch':
        return { ...s, launches: s.launches + 1, lastRun: simulate(s) };
      case 'clear':
        return s.placed.some(Boolean) ? { ...s, placed: s.placed.map(() => null), lastRun: null } : s;
      default:
        return s;
    }
  },
  isComplete: (s) => s.lastRun?.outcome === 'exit',
  score: (s, { hintsUsed }) => 100 + Math.max(0, 50 - Math.max(0, s.launches - 1) * 10 - hintsUsed * 10),
  hint(s, tier: HintTier): GameHint {
    const sol = solveLab(s);
    if (!sol) return { tier, text: 'Clear your devices and watch the orb drift first.', highlightIds: [] };
    const spots = sol.flatMap((k, i) => (k ? [{ i, k }] : []));
    const name = (k: DeviceKind) => (k === 'repel' ? 'repulsor' : k === 'strongAttract' ? 'strong attractor' : 'attractor');
    if (tier === 1) return { tier, text: `It can be done with ${spots.length} device${spots.length === 1 ? '' : 's'}: ${spots.map((x) => name(x.k)).join(' and ')}.`, highlightIds: [] };
    const show = spots.slice(0, tier === 2 ? 1 : 2);
    return { tier, text: show.map((x) => `An ${name(x.k)} belongs on the highlighted square.`).join(' '), highlightIds: show.map((x) => squareId(x.i)) };
  },
};

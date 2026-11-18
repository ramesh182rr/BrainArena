import type { DifficultyBand, GameHint, GameModule, HintTier, PuzzleLevel, ValidationResult } from '@/game-runtime/contracts';
import { createRng, fingerprint, levelSeedKey, type Rng } from '@/game-runtime/rng';

/**
 * Pulsewick (W4-G05): pulse timing.
 *
 * Firing the source sends a pulse one cell per tick. Relays re-fire along
 * their arrow one tick after a pulse arrives (slow relays: two ticks).
 * Splitters fire both ways along their axis. Twin locks fire only when two
 * pulses arrive in the same tick. Every node fires at most once. Light every
 * star, turning nodes within the rotation budget before pressing Fire.
 */

export type Dir = 0 | 1 | 2 | 3;
export type ChainNode =
  | { t: 'empty' }
  | { t: 'wall' }
  | { t: 'source'; dir: Dir }
  | { t: 'relay'; slow: boolean }
  | { t: 'split' }
  | { t: 'twin'; dir: Dir }
  | { t: 'star' };

export interface RunResult {
  lit: number[];
  /** Cells pulses passed through, with the tick they arrived. */
  trail: { cell: number; tick: number }[];
  fired: number[];
  success: boolean;
}

export interface ChainState {
  band: DifficultyBand;
  width: number;
  height: number;
  nodes: readonly ChainNode[];
  /** Orientation per cell (relays 0–3, splitters 0–1); ignored elsewhere. */
  initial: readonly number[];
  orient: readonly number[];
  rotations: number;
  budget: number;
  fires: number;
  lastRun: RunResult | null;
  par: number;
}

export type ChainAction = { type: 'rotate'; cell: number } | { type: 'fire' } | { type: 'reset' };

export const CHAIN_REACTION_ID = 'W4-G05';
export const CHAIN_REACTION_VERSION = '1.0.0';
const MAX_TICKS = 60;

export const rotatable = (n: ChainNode) => n.t === 'relay' || n.t === 'split';
export const states = (n: ChainNode) => (n.t === 'split' ? 2 : 4);
/** Taps needed to turn a node from `from` to `to`. */
export const tapsBetween = (n: ChainNode, from: number, to: number) => (to - from + states(n)) % states(n);

function step(w: number, h: number, cell: number, d: Dir): number | null {
  const r = Math.floor(cell / w) + (d === 0 ? -1 : d === 2 ? 1 : 0);
  const c = (cell % w) + (d === 1 ? 1 : d === 3 ? -1 : 0);
  return r < 0 || r >= h || c < 0 || c >= w ? null : r * w + c;
}

export function simulate(s: Pick<ChainState, 'width' | 'height' | 'nodes'>, orient: readonly number[]): RunResult {
  const { width: w, height: h, nodes } = s;
  const fired = new Set<number>();
  const lit = new Set<number>();
  const trail: { cell: number; tick: number }[] = [];
  // Emissions scheduled as [tick, cell, dir]: the pulse appears in the neighbour at tick + 1.
  let emissions: [number, number, Dir][] = [];
  nodes.forEach((n, i) => {
    if (n.t === 'source') {
      emissions.push([0, i, n.dir]);
      fired.add(i);
    }
  });
  let pulses: { cell: number; dir: Dir }[] = [];
  for (let tick = 1; tick <= MAX_TICKS; tick += 1) {
    const next: { cell: number; dir: Dir }[] = [];
    const launch = (from: number, dir: Dir) => {
      const c = step(w, h, from, dir);
      if (c !== null) next.push({ cell: c, dir });
    };
    for (const p of pulses) launch(p.cell, p.dir);
    emissions = emissions.filter(([t, cell, dir]) => {
      if (t === tick - 1) {
        launch(cell, dir);
        return false;
      }
      return true;
    });
    if (next.length === 0 && emissions.length === 0) break;
    pulses = [];
    const arrivals = new Map<number, number>();
    for (const p of next) {
      trail.push({ cell: p.cell, tick });
      const n = nodes[p.cell]!;
      if (n.t === 'empty') {
        pulses.push(p);
        continue;
      }
      arrivals.set(p.cell, (arrivals.get(p.cell) ?? 0) + 1);
    }
    for (const [cell, count] of arrivals) {
      const n = nodes[cell]!;
      if (n.t === 'star') lit.add(cell);
      if (fired.has(cell)) continue;
      if (n.t === 'relay') {
        fired.add(cell);
        emissions.push([tick + (n.slow ? 1 : 0), cell, (orient[cell] ?? 0) as Dir]);
      } else if (n.t === 'split') {
        fired.add(cell);
        const axis = orient[cell] ?? 0;
        emissions.push([tick, cell, (axis === 0 ? 0 : 1) as Dir], [tick, cell, (axis === 0 ? 2 : 3) as Dir]);
      } else if (n.t === 'twin' && count >= 2) {
        fired.add(cell);
        emissions.push([tick, cell, n.dir]);
      }
    }
  }
  const stars = nodes.flatMap((n, i) => (n.t === 'star' ? [i] : []));
  return { lit: [...lit].sort((a, b) => a - b), trail, fired: [...fired].sort((a, b) => a - b), success: stars.length > 0 && stars.every((i) => lit.has(i)) };
}

/** Cheapest set of orientations (fewest taps) that lights every star, by exhaustive search. */
export function solveChain(s: Pick<ChainState, 'width' | 'height' | 'nodes' | 'initial'>): { orient: number[]; taps: number } | null {
  const rot = s.nodes.flatMap((n, i) => (rotatable(n) ? [i] : []));
  let best: { orient: number[]; taps: number } | null = null;
  const orient = [...s.initial];
  const go = (k: number, taps: number) => {
    if (best && taps >= best.taps) return;
    if (k === rot.length) {
      if (simulate(s, orient).success) best = { orient: [...orient], taps };
      return;
    }
    const i = rot[k]!;
    const n = s.nodes[i]!;
    for (let o = 0; o < states(n); o += 1) {
      orient[i] = o;
      go(k + 1, taps + tapsBetween(n, s.initial[i]!, o));
    }
    orient[i] = s.initial[i]!;
  };
  go(0, 0);
  return best;
}

interface Profile {
  size: number;
  relays: number;
  slow: number;
  splits: number;
  twin: boolean;
  par: readonly [number, number];
}

export const CHAIN_PROFILES: Readonly<Record<DifficultyBand, Profile>> = {
  intro: { size: 5, relays: 2, slow: 0, splits: 0, twin: false, par: [1, 3] },
  easy: { size: 5, relays: 3, slow: 0, splits: 1, twin: false, par: [2, 4] },
  standard: { size: 6, relays: 3, slow: 1, splits: 1, twin: false, par: [2, 5] },
  advanced: { size: 6, relays: 4, slow: 0, splits: 1, twin: true, par: [2, 6] },
  expert: { size: 7, relays: 5, slow: 1, splits: 2, twin: true, par: [3, 7] },
};

export function assembleChain(band: DifficultyBand, width: number, height: number, nodes: readonly ChainNode[], initial: readonly number[], par: number): ChainState {
  return { band, width, height, nodes, initial, orient: initial, rotations: 0, budget: par + 2, fires: 0, lastRun: null, par };
}

/**
 * Twin motif: source → splitter firing left/right → two relays pointing down →
 * two relays pointing inward → twin lock in the middle. Both branches are the
 * same length, so the pulses meet in the same tick. Returns the solution
 * orientation for the motif's nodes, or null if it does not fit.
 */
function placeTwinMotif(rng: Rng, size: number, nodes: ChainNode[], solution: number[]): number | null {
  const k = rng.int(1, 2);
  const m = rng.int(1, 2);
  const lead = rng.int(1, 2);
  const c = rng.int(k, size - 1 - k);
  const r = rng.int(lead, size - 1 - m - 1);
  const at = (row: number, col: number) => row * size + col;
  const cells = {
    source: at(r - lead, c),
    split: at(r, c),
    topL: at(r, c - k),
    topR: at(r, c + k),
    botL: at(r + m, c - k),
    botR: at(r + m, c + k),
    twin: at(r + m, c),
  };
  if (Object.values(cells).some((i) => nodes[i]!.t !== 'empty')) return null;
  nodes[cells.source] = { t: 'source', dir: 2 };
  nodes[cells.split] = { t: 'split' };
  solution[cells.split] = 1;
  for (const [cell, dir] of [[cells.topL, 2], [cells.topR, 2], [cells.botL, 1], [cells.botR, 3]] as const) {
    nodes[cell] = { t: 'relay', slow: false };
    solution[cell] = dir;
  }
  const twinDir: Dir = r + m + 2 < size ? 2 : 0;
  nodes[cells.twin] = { t: 'twin', dir: twinDir };
  // A star a step or two past the twin, so only the twin's pulse can light it.
  const starRow = twinDir === 2 ? r + m + rng.int(1, Math.min(2, size - 1 - (r + m))) : r + m - 1;
  if (starRow < 0 || starRow >= size || starRow === r) return null;
  const star = at(starRow, c);
  if (nodes[star]!.t !== 'empty') return null;
  nodes[star] = { t: 'star' };
  return cells.twin;
}

function tryBuild(rng: Rng, band: DifficultyBand, p: Profile): ChainState | null {
  const n = p.size * p.size;
  const nodes: ChainNode[] = Array.from({ length: n }, () => ({ t: 'empty' }));
  const solution: number[] = new Array(n).fill(0);
  const free = () => rng.pick(nodes.flatMap((x, i) => (x.t === 'empty' ? [i] : [])));
  let twinCell = -1;
  let relaysLeft = p.relays;
  let splitsLeft = p.splits;
  if (p.twin) {
    twinCell = placeTwinMotif(rng, p.size, nodes, solution) ?? -1;
    if (twinCell < 0) return null;
    relaysLeft -= 4;
    splitsLeft -= 1;
  } else {
    nodes[free()] = { t: 'source', dir: rng.int(0, 3) as Dir };
  }
  for (let k = 0; k < relaysLeft; k += 1) {
    const i = free();
    nodes[i] = { t: 'relay', slow: k < p.slow };
    solution[i] = rng.int(0, 3);
  }
  for (let k = 0; k < splitsLeft; k += 1) {
    const i = free();
    nodes[i] = { t: 'split' };
    solution[i] = rng.int(0, 1);
  }
  for (let k = 0; k < 2; k += 1) nodes[free()] = { t: 'wall' };
  const board = { width: p.size, height: p.size, nodes };
  let run = simulate(board, solution);
  if (!p.twin) {
    // Stars go where pulses travel late in the chain, so reaching them takes the whole reaction.
    const reached = [...new Map(run.trail.filter((t) => nodes[t.cell]!.t === 'empty').map((t) => [t.cell, t.tick])).entries()].sort((a, b) => b[1] - a[1]);
    if (reached.length < 2) return null;
    for (const [cell] of reached.slice(0, rng.int(1, Math.min(3, reached.length)))) nodes[cell] = { t: 'star' };
    run = simulate(board, solution);
  }
  if (!run.success) return null;
  const initial = solution.map((o, i) => (rotatable(nodes[i]!) ? rng.int(0, states(nodes[i]!) - 1) : o));
  if (simulate(board, initial).success) return null;
  const best = solveChain({ ...board, initial });
  if (!best || best.taps < p.par[0] || best.taps > p.par[1]) return null;
  // The twin lock must matter: it fires in the cheapest solution.
  if (p.twin && !simulate(board, best.orient).fired.includes(twinCell)) return null;
  return assembleChain(band, p.size, p.size, nodes, initial, best.taps);
}

export function generateChain(key: string, band: DifficultyBand): ChainState {
  const rng = createRng(key);
  for (let i = 0; i < 600; i += 1) {
    const s = tryBuild(rng, band, CHAIN_PROFILES[band]);
    if (s) return s;
  }
  throw new Error('No acceptable network within the attempt budget');
}

export const CHAIN_TUTORIALS = [
  { id: 'tutorial-1', difficulty: 'intro' as const, intro: 'Tap a relay to turn its arrow, then press Fire. The pulse must light every star.' },
  { id: 'tutorial-2', difficulty: 'standard' as const, intro: 'Splitters fire both ways along their line. Slow relays (with a 2) wait an extra tick.' },
  { id: 'tutorial-3', difficulty: 'advanced' as const, intro: 'A twin lock (double ring) only fires when two pulses reach it in the same tick. Time the chain.' },
];

export const chainFingerprint = (s: ChainState) => fingerprint(JSON.stringify([s.width, s.height, s.nodes, s.initial]));
export const nodeId = (i: number) => `node-${i}`;

function toLevel(s: ChainState, seed: string, difficulty: DifficultyBand, source: PuzzleLevel['source'], levelId: string): PuzzleLevel<ChainState> {
  return { gameId: CHAIN_REACTION_ID, levelId, generatorVersion: CHAIN_REACTION_VERSION, seed, difficulty, source, fingerprint: chainFingerprint(s), initialState: s, metadata: { size: s.width, par: s.par } };
}

export const chainReaction: GameModule<ChainState, ChainAction> = {
  id: CHAIN_REACTION_ID,
  version: CHAIN_REACTION_VERSION,
  createLevel(seed, difficulty) {
    const t = CHAIN_TUTORIALS.find((x) => x.id === seed);
    const band = t ? t.difficulty : difficulty;
    return toLevel(generateChain(levelSeedKey(CHAIN_REACTION_ID, CHAIN_REACTION_VERSION, `${seed}/${band}`), band), seed, band, t ? 'authored' : 'generated', `${CHAIN_REACTION_ID}:${t ? seed : `${band}:${seed}`}`);
  },
  fallbackLevel(difficulty) {
    return toLevel(generateChain(levelSeedKey(CHAIN_REACTION_ID, CHAIN_REACTION_VERSION, `curated/${difficulty}`), difficulty), 'curated', difficulty, 'fallback', `${CHAIN_REACTION_ID}:fallback-${difficulty}`);
  },
  validateLevel(level): ValidationResult {
    if (level.gameId !== CHAIN_REACTION_ID) return { valid: false, reasonCode: 'wrong_game' };
    const s = level.initialState;
    if (s.nodes.length !== s.width * s.height || s.nodes.filter((n) => n.t === 'source').length !== 1) return { valid: false, reasonCode: 'bad_board' };
    if (!s.nodes.some((n) => n.t === 'star')) return { valid: false, reasonCode: 'no_stars' };
    if (s.rotations || s.fires || s.orient.some((o, i) => o !== s.initial[i])) return { valid: false, reasonCode: 'bad_start' };
    if (simulate(s, s.initial).success) return { valid: false, reasonCode: 'already_solved' };
    const best = solveChain(s);
    if (!best) return { valid: false, reasonCode: 'unsolvable' };
    if (best.taps !== s.par || s.budget < s.par) return { valid: false, reasonCode: 'par_mismatch' };
    if (level.fingerprint !== chainFingerprint(s)) return { valid: false, reasonCode: 'fingerprint_mismatch' };
    return { valid: true, solutionFingerprint: fingerprint(best.orient.join()) };
  },
  reduce(s, a) {
    if (s.lastRun?.success) return s;
    switch (a.type) {
      case 'rotate': {
        const n = s.nodes[a.cell];
        if (!n || !rotatable(n) || s.rotations >= s.budget) return s;
        const orient = [...s.orient];
        orient[a.cell] = ((orient[a.cell] ?? 0) + 1) % states(n);
        return { ...s, orient, rotations: s.rotations + 1, lastRun: null };
      }
      case 'fire':
        return { ...s, fires: s.fires + 1, lastRun: simulate(s, s.orient) };
      case 'reset':
        return s.rotations || s.lastRun ? { ...s, orient: s.initial, rotations: 0, lastRun: null } : s;
      default:
        return s;
    }
  },
  isComplete: (s) => s.lastRun?.success === true,
  score: (s, { hintsUsed }) => 100 + Math.max(0, 50 - Math.max(0, s.rotations - s.par) * 5 - Math.max(0, s.fires - 1) * 10 - hintsUsed * 10),
  hint(s, tier: HintTier): GameHint {
    const best = solveChain(s.rotations ? { ...s, initial: s.orient } : s);
    if (!best) return { tier, text: 'Reset the turns and plan the chain again.', highlightIds: [] };
    const wrong = s.nodes.flatMap((n, i) => (rotatable(n) && s.orient[i] !== best.orient[i] ? [i] : []));
    if (wrong.length === 0) return { tier, text: 'Everything is set. Press Fire!', highlightIds: [] };
    if (tier === 1) return { tier, text: `${wrong.length} node${wrong.length === 1 ? ' needs' : 's need'} turning. Follow the pulse from the source.`, highlightIds: [] };
    const show = wrong.slice(0, tier === 2 ? 1 : 2);
    return {
      tier,
      text: show.map((i) => `Tap the highlighted node ${tapsBetween(s.nodes[i]!, s.orient[i]!, best.orient[i]!)} time(s).`).join(' '),
      highlightIds: show.map(nodeId),
    };
  },
};

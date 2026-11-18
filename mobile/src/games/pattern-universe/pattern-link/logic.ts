import type { DifficultyBand, GameHint, GameModule, HintTier, PuzzleLevel, ValidationResult } from '@/game-runtime/contracts';
import { createRng, fingerprint, levelSeedKey, type Rng } from '@/game-runtime/rng';

/**
 * Pattern Link (W4-G03): motif weaving.
 *
 * A grid of motif tiles. Walk from the start tile to the goal one step at a
 * time; each step must follow a hidden grammar saying which motifs may come
 * next. The grammar is shown only through example trails (and, gently, by the
 * steps it refuses). Harder grammars alternate between two rules on odd and
 * even steps, or allow two successors.
 */

export const MOTIFS = ['sun', 'moon', 'leaf', 'wave', 'star'] as const;
export type Motif = number;

export interface Grammar {
  /** next[rule][motif] = motifs allowed after `motif` under that rule. */
  next: number[][][];
}

export interface WeaveState {
  band: DifficultyBand;
  width: number;
  height: number;
  motifs: readonly Motif[];
  palette: number;
  grammar: Grammar;
  /** Example trails that follow the grammar from their first step. */
  examples: readonly Motif[][];
  showRule: boolean;
  start: number;
  goal: number;
  par: number;
  path: number[];
  refusals: number;
  lastRefusal: string | null;
}

export type WeaveAction = { type: 'step'; cell: number } | { type: 'undo' } | { type: 'reset' };

export const PATTERN_LINK_ID = 'W4-G03';
export const PATTERN_LINK_VERSION = '1.0.0';

export const ruleFor = (g: Grammar, stepIndex: number) => g.next[stepIndex % g.next.length]!;
export const allowed = (g: Grammar, stepIndex: number, from: Motif, to: Motif) => ruleFor(g, stepIndex)[from]!.includes(to);

function neighbours(w: number, h: number, i: number): number[] {
  const r = Math.floor(i / w);
  const c = i % w;
  return [r > 0 ? i - w : -1, c < w - 1 ? i + 1 : -1, r < h - 1 ? i + w : -1, c > 0 ? i - 1 : -1].filter((x) => x >= 0);
}

/** Shortest legal walk from start to goal (revisits allowed), as cells. */
export function solveWeave(s: Pick<WeaveState, 'width' | 'height' | 'motifs' | 'grammar' | 'start' | 'goal'>, from: readonly number[] = [s.start]): number[] | null {
  const period = s.grammar.next.length;
  const startCell = from[from.length - 1]!;
  const startStep = from.length - 1;
  const key = (cell: number, step: number) => cell * period + (step % period);
  const prev = new Map<number, number>([[key(startCell, startStep), -1]]);
  let frontier: [number, number][] = [[startCell, startStep]];
  while (frontier.length) {
    const next: [number, number][] = [];
    for (const [cell, step] of frontier) {
      if (cell === s.goal && step > startStep) {
        const out: number[] = [];
        let k = key(cell, step);
        let c = cell;
        while (k !== -1) {
          out.unshift(c);
          const p = prev.get(k)!;
          if (p === -1) break;
          c = Math.floor(p / period);
          k = p;
        }
        return [...from.slice(0, -1), ...out];
      }
      for (const n of neighbours(s.width, s.height, cell)) {
        if (!allowed(s.grammar, step, s.motifs[cell]!, s.motifs[n]!)) continue;
        const k = key(n, step + 1);
        if (prev.has(k)) continue;
        prev.set(k, key(cell, step));
        next.push([n, step + 1]);
      }
    }
    frontier = next;
  }
  return null;
}

interface Profile {
  size: number;
  palette: number;
  rules: number;
  branching: number;
  showRule: boolean;
  examples: number;
  /** Extra steps beyond the direct distance the grammar must force. */
  detour: number;
  par: [number, number];
}

export const WEAVE_PROFILES: Readonly<Record<DifficultyBand, Profile>> = {
  intro: { size: 4, palette: 3, rules: 1, branching: 1, showRule: true, examples: 1, detour: 0, par: [3, 7] },
  easy: { size: 5, palette: 3, rules: 1, branching: 1, showRule: false, examples: 2, detour: 0, par: [4, 9] },
  standard: { size: 5, palette: 4, rules: 1, branching: 1, showRule: false, examples: 2, detour: 2, par: [6, 12] },
  advanced: { size: 5, palette: 4, rules: 2, branching: 1, showRule: false, examples: 3, detour: 2, par: [6, 14] },
  expert: { size: 6, palette: 5, rules: 1, branching: 2, showRule: false, examples: 3, detour: 2, par: [7, 16] },
};

function randomGrammar(rng: Rng, p: Profile): Grammar {
  const next: number[][][] = [];
  for (let r = 0; r < p.rules; r += 1) {
    // A cycle through the palette, never a motif following itself.
    const order = rng.shuffle(Array.from({ length: p.palette }, (_, i) => i));
    const rule: number[][] = Array.from({ length: p.palette }, () => []);
    order.forEach((m, i) => rule[m]!.push(order[(i + 1) % order.length]!));
    if (p.branching > 1) {
      for (let m = 0; m < p.palette; m += 1) {
        const extra = rng.pick(Array.from({ length: p.palette }, (_, i) => i).filter((x) => x !== m && !rule[m]!.includes(x)));
        rule[m]!.push(extra);
      }
    }
    next.push(rule);
  }
  return { next };
}

function exampleTrail(rng: Rng, g: Grammar, length: number, palette: number): Motif[] {
  const out = [rng.int(0, palette - 1)];
  for (let i = 0; i < length - 1; i += 1) out.push(rng.pick(ruleFor(g, i)[out[out.length - 1]!]!));
  return out;
}

function tryBuild(rng: Rng, band: DifficultyBand, p: Profile): WeaveState | null {
  const grammar = randomGrammar(rng, p);
  const n = p.size * p.size;
  const motifs = Array.from({ length: n }, () => rng.int(0, p.palette - 1));
  // Start on the left edge, goal on the right edge.
  const start = rng.int(0, p.size - 1) * p.size;
  const goal = rng.int(0, p.size - 1) * p.size + p.size - 1;
  const base = { width: p.size, height: p.size, motifs, grammar, start, goal };
  const sol = solveWeave(base);
  if (!sol) return null;
  const par = sol.length - 1;
  if (par < p.par[0] || par > p.par[1]) return null;
  // From the standard band on, the grammar must force a detour beyond the direct distance.
  const manhattan = Math.abs(Math.floor(start / p.size) - Math.floor(goal / p.size)) + Math.abs((start % p.size) - (goal % p.size));
  if (par < manhattan + p.detour) return null;
  const examples = Array.from({ length: p.examples }, () => exampleTrail(rng, grammar, Math.max(5, p.palette * p.rules + 2), p.palette));
  return { band, width: p.size, height: p.size, motifs, palette: p.palette, grammar, examples, showRule: p.showRule, start, goal, par, path: [start], refusals: 0, lastRefusal: null };
}

export function generateWeave(key: string, band: DifficultyBand, p: Profile = WEAVE_PROFILES[band]): WeaveState {
  const rng = createRng(key);
  for (let i = 0; i < 8000; i += 1) {
    const s = tryBuild(rng, band, p);
    if (s) return s;
  }
  throw new Error('No acceptable weave within the attempt budget');
}

export const WEAVE_TUTORIALS = [
  { id: 'tutorial-1', difficulty: 'intro' as const, intro: 'Walk from the start to the goal. The rule card shows which motif may come next after each one.', profile: WEAVE_PROFILES.intro },
  { id: 'tutorial-2', difficulty: 'easy' as const, intro: 'No rule card now: work out the rule from the example trails, then walk.', profile: WEAVE_PROFILES.easy },
  { id: 'tutorial-3', difficulty: 'advanced' as const, intro: 'Two rules take turns: one for odd steps, one for even steps. Compare the examples position by position.', profile: WEAVE_PROFILES.advanced },
];

export const weaveFingerprint = (s: WeaveState) => fingerprint(JSON.stringify([s.width, s.motifs, s.grammar, s.start, s.goal]));
export const tileId = (i: number) => `tile-${i}`;

function toLevel(s: WeaveState, seed: string, difficulty: DifficultyBand, source: PuzzleLevel['source'], levelId: string): PuzzleLevel<WeaveState> {
  return { gameId: PATTERN_LINK_ID, levelId, generatorVersion: PATTERN_LINK_VERSION, seed, difficulty, source, fingerprint: weaveFingerprint(s), initialState: s, metadata: { size: s.width, par: s.par, rules: s.grammar.next.length } };
}

const atGoal = (s: WeaveState) => s.path.length > 1 && s.path[s.path.length - 1] === s.goal;

export const patternLink: GameModule<WeaveState, WeaveAction> = {
  id: PATTERN_LINK_ID,
  version: PATTERN_LINK_VERSION,
  createLevel(seed, difficulty) {
    const t = WEAVE_TUTORIALS.find((x) => x.id === seed);
    if (t) return toLevel(generateWeave(levelSeedKey(PATTERN_LINK_ID, PATTERN_LINK_VERSION, seed), t.difficulty, t.profile), seed, t.difficulty, 'authored', `${PATTERN_LINK_ID}:${seed}`);
    return toLevel(generateWeave(levelSeedKey(PATTERN_LINK_ID, PATTERN_LINK_VERSION, `${seed}/${difficulty}`), difficulty), seed, difficulty, 'generated', `${PATTERN_LINK_ID}:${difficulty}:${seed}`);
  },
  fallbackLevel(difficulty) {
    return toLevel(generateWeave(levelSeedKey(PATTERN_LINK_ID, PATTERN_LINK_VERSION, `curated/${difficulty}`), difficulty), 'curated', difficulty, 'fallback', `${PATTERN_LINK_ID}:fallback-${difficulty}`);
  },
  validateLevel(level): ValidationResult {
    if (level.gameId !== PATTERN_LINK_ID) return { valid: false, reasonCode: 'wrong_game' };
    const s = level.initialState;
    if (s.motifs.length !== s.width * s.height || s.motifs.some((m) => m < 0 || m >= s.palette)) return { valid: false, reasonCode: 'bad_board' };
    if (s.path.length !== 1 || s.path[0] !== s.start || s.refusals) return { valid: false, reasonCode: 'bad_start' };
    for (const ex of s.examples) for (let i = 0; i + 1 < ex.length; i += 1) if (!allowed(s.grammar, i, ex[i]!, ex[i + 1]!)) return { valid: false, reasonCode: 'bad_example' };
    const sol = solveWeave(s);
    if (!sol) return { valid: false, reasonCode: 'unsolvable' };
    if (sol.length - 1 !== s.par) return { valid: false, reasonCode: 'par_mismatch' };
    if (level.fingerprint !== weaveFingerprint(s)) return { valid: false, reasonCode: 'fingerprint_mismatch' };
    return { valid: true, solutionFingerprint: fingerprint(sol.join(',')) };
  },
  reduce(s, a) {
    if (atGoal(s)) return s;
    switch (a.type) {
      case 'step': {
        const at = s.path[s.path.length - 1]!;
        if (!neighbours(s.width, s.height, at).includes(a.cell)) return s.lastRefusal === 'Step to a tile next to the glowing one.' ? s : { ...s, lastRefusal: 'Step to a tile next to the glowing one.' };
        const step = s.path.length - 1;
        if (!allowed(s.grammar, step, s.motifs[at]!, s.motifs[a.cell]!)) {
          return { ...s, refusals: s.refusals + 1, lastRefusal: `A ${MOTIFS[s.motifs[a.cell]!]} can't follow a ${MOTIFS[s.motifs[at]!]} on step ${step + 1}.` };
        }
        return { ...s, path: [...s.path, a.cell], lastRefusal: null };
      }
      case 'undo':
        return s.path.length > 1 ? { ...s, path: s.path.slice(0, -1), lastRefusal: null } : s;
      case 'reset':
        return s.path.length > 1 ? { ...s, path: [s.start], lastRefusal: null } : s;
      default:
        return s;
    }
  },
  isComplete: atGoal,
  score(s, { hintsUsed }) {
    const extra = Math.max(0, s.path.length - 1 - s.par);
    return 100 + Math.max(0, 50 - s.refusals * 4 - extra * 3 - hintsUsed * 10);
  },
  hint(s, tier: HintTier): GameHint {
    if (tier === 1) {
      const ex = s.examples[0]!;
      return { tier, text: `In the first example, ${MOTIFS[ex[0]!]} is followed by ${MOTIFS[ex[1]!]}. Look for that pairing everywhere.`, highlightIds: [] };
    }
    const sol = solveWeave(s, s.path) ?? solveWeave(s);
    if (!sol) return { tier, text: 'Undo back to the start and try another way.', highlightIds: [] };
    const fromPlayer = sol.slice(0, s.path.length).every((c, i) => c === s.path[i]);
    if (!fromPlayer) return { tier, text: 'There is no way on from here. Undo a few steps.', highlightIds: [] };
    const next = sol.slice(s.path.length, s.path.length + (tier === 2 ? 1 : 2));
    return { tier, text: tier === 2 ? 'Step onto the highlighted tile.' : 'Step onto the highlighted tiles, in order.', highlightIds: next.map(tileId) };
  },
};

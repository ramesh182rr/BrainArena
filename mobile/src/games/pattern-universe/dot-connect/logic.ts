import type { DifficultyBand, GameHint, GameModule, HintTier, PuzzleLevel, ValidationResult } from '@/game-runtime/contracts';
import { createRng, fingerprint, levelSeedKey, type Rng } from '@/game-runtime/rng';

/**
 * Star Thread (W4-G01): signal constellation.
 *
 * Route a signal from the source star to the beacon by tapping stars in order.
 * The route must light every star exactly once, travel only along the faint
 * links, and never hop between two stars of the same colour. Some links are
 * one-way. Drawn edges only: no tiles, no rotation, no crossings to manage.
 */

export const HUES = ['gold', 'aqua', 'rose'] as const;
export type Hue = (typeof HUES)[number];

export interface Star {
  x: number;
  y: number;
  hue: Hue | null;
}
export interface Link {
  a: number;
  b: number;
  /** One-way from a to b. */
  oneWay: boolean;
}

export interface ConstellationState {
  band: DifficultyBand;
  stars: readonly Star[];
  links: readonly Link[];
  source: number;
  beacon: number;
  route: number[];
  backtracks: number;
  lastRefusal: string | null;
}

export type ConstellationAction = { type: 'tap'; star: number } | { type: 'undo' } | { type: 'reset' };

export const DOT_CONNECT_ID = 'W4-G01';
export const DOT_CONNECT_VERSION = '1.0.0';

export function canHop(s: Pick<ConstellationState, 'stars' | 'links'>, from: number, to: number): 'ok' | 'unlinked' | 'oneway' | 'hue' {
  const l = s.links.find((x) => (x.a === from && x.b === to) || (x.a === to && x.b === from));
  if (!l) return 'unlinked';
  if (l.oneWay && l.a !== from) return 'oneway';
  const h1 = s.stars[from]!.hue;
  const h2 = s.stars[to]!.hue;
  if (h1 && h2 && h1 === h2) return 'hue';
  return 'ok';
}

/** Counts valid routes (up to `limit`), returning the first one found. */
export function solveConstellation(s: Pick<ConstellationState, 'stars' | 'links' | 'source' | 'beacon'>, limit = 3, prefix: readonly number[] = [s.source]): { count: number; first: number[] | null } {
  const n = s.stars.length;
  const adj: number[][] = Array.from({ length: n }, () => []);
  for (let i = 0; i < n; i += 1) for (let j = 0; j < n; j += 1) if (i !== j && canHop(s, i, j) === 'ok') adj[i]!.push(j);
  const route = [...prefix];
  const seen = new Set(route);
  let count = 0;
  let first: number[] | null = null;
  const go = () => {
    if (count >= limit) return;
    const at = route[route.length - 1]!;
    if (route.length === n) {
      if (at === s.beacon) {
        count += 1;
        if (!first) first = [...route];
      }
      return;
    }
    if (at === s.beacon) return;
    for (const nx of adj[at]!) {
      if (seen.has(nx)) continue;
      // The beacon must be last.
      if (nx === s.beacon && route.length !== n - 1) continue;
      seen.add(nx);
      route.push(nx);
      go();
      route.pop();
      seen.delete(nx);
    }
  };
  go();
  return { count, first };
}

function segmentsCross(p: Star, q: Star, r: Star, t: Star): boolean {
  const o = (a: Star, b: Star, c: Star) => Math.sign((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x));
  return o(p, q, r) * o(p, q, t) < 0 && o(r, t, p) * o(r, t, q) < 0;
}

interface Profile {
  stars: number;
  hues: number;
  oneWay: number;
  maxSolutions: number;
}

export const DOT_PROFILES: Readonly<Record<DifficultyBand, Profile>> = {
  intro: { stars: 5, hues: 0, oneWay: 0, maxSolutions: 2 },
  easy: { stars: 6, hues: 2, oneWay: 0, maxSolutions: 2 },
  standard: { stars: 8, hues: 3, oneWay: 0, maxSolutions: 1 },
  advanced: { stars: 9, hues: 3, oneWay: 1, maxSolutions: 1 },
  expert: { stars: 11, hues: 3, oneWay: 2, maxSolutions: 1 },
};

function tryBuild(rng: Rng, band: DifficultyBand, p: Profile): ConstellationState | null {
  // Jittered grid positions keep stars apart and the picture readable.
  const cols = Math.ceil(Math.sqrt(p.stars * 1.4));
  const rows = Math.ceil((p.stars * 1.3) / cols) + 1;
  const slots = rng.shuffle(Array.from({ length: cols * rows }, (_, i) => i)).slice(0, p.stars);
  const stars: Star[] = slots.map((k) => ({ x: ((k % cols) + 0.5 + (rng.next() - 0.5) * 0.5) / cols, y: (Math.floor(k / cols) + 0.5 + (rng.next() - 0.5) * 0.5) / rows, hue: p.hues ? HUES[rng.int(0, p.hues - 1)]! : null }));
  // Links: shortest pairs first, skipping any that would cross an accepted link.
  const pairs: [number, number, number][] = [];
  for (let i = 0; i < stars.length; i += 1) for (let j = i + 1; j < stars.length; j += 1) pairs.push([i, j, Math.hypot(stars[i]!.x - stars[j]!.x, stars[i]!.y - stars[j]!.y)]);
  pairs.sort((a, b) => a[2] - b[2]);
  const links: Link[] = [];
  const degree = stars.map(() => 0);
  for (const [a, b, d] of pairs) {
    if (d > 0.55 || degree[a]! >= 4 || degree[b]! >= 4) continue;
    if (links.some((l) => l.a !== a && l.a !== b && l.b !== a && l.b !== b && segmentsCross(stars[a]!, stars[b]!, stars[l.a]!, stars[l.b]!))) continue;
    links.push({ a, b, oneWay: false });
    degree[a]! += 1;
    degree[b]! += 1;
  }
  const [source, beacon] = rng.shuffle(Array.from({ length: stars.length }, (_, i) => i)).slice(0, 2) as [number, number];
  const base = { stars, links, source, beacon };
  const plain = solveConstellation(base, 50);
  if (!plain.first) return null;
  // One-way links follow the direction of a valid route, so it stays solvable.
  const route = plain.first;
  for (let k = 0; k < p.oneWay; k += 1) {
    const i = rng.int(0, route.length - 2);
    const [a, b] = [route[i]!, route[i + 1]!];
    const l = links.find((x) => (x.a === a && x.b === b) || (x.a === b && x.b === a));
    if (l) {
      l.a = a;
      l.b = b;
      l.oneWay = true;
    }
  }
  const final = solveConstellation(base, p.maxSolutions + 1);
  if (final.count === 0 || final.count > p.maxSolutions) return null;
  // The colour rule must matter from the easy band on.
  if (p.hues && solveConstellation({ ...base, stars: stars.map((s) => ({ ...s, hue: null })) }, p.maxSolutions + 1).count <= final.count) return null;
  return { band, stars, links, source, beacon, route: [source], backtracks: 0, lastRefusal: null };
}

export function generateConstellation(key: string, band: DifficultyBand, p: Profile = DOT_PROFILES[band]): ConstellationState {
  const rng = createRng(key);
  for (let i = 0; i < 3000; i += 1) {
    const s = tryBuild(rng, band, p);
    if (s) return s;
  }
  throw new Error('No acceptable constellation within the attempt budget');
}

export const DOT_TUTORIALS = [
  { id: 'tutorial-1', difficulty: 'intro' as const, intro: 'Start at the source and tap stars one by one along the faint links. Light every star, ending at the beacon.', profile: DOT_PROFILES.intro },
  { id: 'tutorial-2', difficulty: 'easy' as const, intro: 'New rule: the signal cannot hop between two stars of the same colour.', profile: DOT_PROFILES.easy },
  { id: 'tutorial-3', difficulty: 'advanced' as const, intro: 'Arrowed links are one-way: the signal may only travel along the arrow.', profile: DOT_PROFILES.advanced },
];

export const constellationFingerprint = (s: ConstellationState) => fingerprint(JSON.stringify([s.stars.map((x) => [x.x.toFixed(3), x.y.toFixed(3), x.hue]), s.links, s.source, s.beacon]));
export const starId = (i: number) => `star-${i}`;
const REFUSAL = { unlinked: 'Those stars are not linked.', oneway: 'That link is one-way the other way.', hue: 'Same colour: the signal cannot hop there.' } as const;

function toLevel(s: ConstellationState, seed: string, difficulty: DifficultyBand, source: PuzzleLevel['source'], levelId: string): PuzzleLevel<ConstellationState> {
  return { gameId: DOT_CONNECT_ID, levelId, generatorVersion: DOT_CONNECT_VERSION, seed, difficulty, source, fingerprint: constellationFingerprint(s), initialState: s, metadata: { stars: s.stars.length, links: s.links.length } };
}

export const isLit = (s: ConstellationState) => s.route.length === s.stars.length && s.route[s.route.length - 1] === s.beacon;

export const dotConnect: GameModule<ConstellationState, ConstellationAction> = {
  id: DOT_CONNECT_ID,
  version: DOT_CONNECT_VERSION,
  createLevel(seed, difficulty) {
    const t = DOT_TUTORIALS.find((x) => x.id === seed);
    if (t) return toLevel(generateConstellation(levelSeedKey(DOT_CONNECT_ID, DOT_CONNECT_VERSION, seed), t.difficulty, t.profile), seed, t.difficulty, 'authored', `${DOT_CONNECT_ID}:${seed}`);
    return toLevel(generateConstellation(levelSeedKey(DOT_CONNECT_ID, DOT_CONNECT_VERSION, `${seed}/${difficulty}`), difficulty), seed, difficulty, 'generated', `${DOT_CONNECT_ID}:${difficulty}:${seed}`);
  },
  fallbackLevel(difficulty) {
    return toLevel(generateConstellation(levelSeedKey(DOT_CONNECT_ID, DOT_CONNECT_VERSION, `curated/${difficulty}`), difficulty), 'curated', difficulty, 'fallback', `${DOT_CONNECT_ID}:fallback-${difficulty}`);
  },
  validateLevel(level): ValidationResult {
    if (level.gameId !== DOT_CONNECT_ID) return { valid: false, reasonCode: 'wrong_game' };
    const s = level.initialState;
    if (s.stars.length < 4 || s.source === s.beacon || !s.stars[s.source] || !s.stars[s.beacon]) return { valid: false, reasonCode: 'bad_board' };
    if (s.route.length !== 1 || s.route[0] !== s.source || s.backtracks) return { valid: false, reasonCode: 'bad_start' };
    const sol = solveConstellation(s, 1);
    if (!sol.first) return { valid: false, reasonCode: 'unsolvable' };
    if (level.fingerprint !== constellationFingerprint(s)) return { valid: false, reasonCode: 'fingerprint_mismatch' };
    return { valid: true, solutionFingerprint: fingerprint(sol.first.join(',')) };
  },
  reduce(s, a) {
    if (isLit(s)) return s;
    switch (a.type) {
      case 'tap': {
        if (!Number.isInteger(a.star) || !s.stars[a.star]) return s;
        const at = s.route[s.route.length - 1]!;
        // Tapping a star already on the route rewinds to it.
        const idx = s.route.indexOf(a.star);
        if (idx >= 0) return idx === s.route.length - 1 ? s : { ...s, route: s.route.slice(0, idx + 1), backtracks: s.backtracks + 1, lastRefusal: null };
        if (a.star === s.beacon && s.route.length !== s.stars.length - 1) return { ...s, lastRefusal: 'The beacon must be the last star.' };
        const why = canHop(s, at, a.star);
        if (why !== 'ok') return s.lastRefusal === REFUSAL[why] ? s : { ...s, lastRefusal: REFUSAL[why] };
        return { ...s, route: [...s.route, a.star], lastRefusal: null };
      }
      case 'undo':
        return s.route.length > 1 ? { ...s, route: s.route.slice(0, -1), backtracks: s.backtracks + 1, lastRefusal: null } : s;
      case 'reset':
        return s.route.length > 1 ? { ...s, route: [s.source], backtracks: s.backtracks + 1, lastRefusal: null } : s;
      default:
        return s;
    }
  },
  isComplete: isLit,
  score: (s, { hintsUsed }) => 100 + Math.max(0, 50 - Math.max(0, s.backtracks - 1) * 4 - hintsUsed * 10),
  hint(s, tier: HintTier): GameHint {
    // Longest valid prefix of the player's route, then the next stars of a full route from there.
    let prefix = [...s.route];
    let sol = solveConstellation(s, 1, prefix);
    while (!sol.first && prefix.length > 1) {
      prefix = prefix.slice(0, -1);
      sol = solveConstellation(s, 1, prefix);
    }
    if (!sol.first) return { tier, text: 'Start over from the source.', highlightIds: [] };
    if (prefix.length < s.route.length) return { tier, text: 'Your route has gone wrong: rewind to the highlighted star.', highlightIds: [starId(prefix[prefix.length - 1]!)] };
    if (tier === 1) return { tier, text: 'Stars with only two links must be passed straight through. Look for them first.', highlightIds: [] };
    const next = sol.first.slice(prefix.length, prefix.length + (tier === 2 ? 1 : 2));
    return { tier, text: tier === 2 ? 'Hop to the highlighted star next.' : 'Hop to the highlighted stars next, in order.', highlightIds: next.map(starId) };
  },
};

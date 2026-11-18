import { DIFFICULTY_BANDS, type DifficultyBand } from '@/game-runtime/contracts';
import { createRng } from '@/game-runtime/rng';
import type { WorldId } from '@/design-system/tokens';

/**
 * Daily Arena planner (M6, PRD FR-030–FR-036).
 *
 * Picks 3–5 playable games for the day from on-device history only. Every pick
 * carries a plain-language reason, and difficulty moves at most one band at a
 * time with a cooldown, so changes stay bounded and explainable. The plan is
 * deterministic for (date, player, inputs) and is cached for the whole day.
 * This is entertainment personalisation, never an assessment.
 */

export const ARENA_SIZES = [3, 4, 5] as const;
export type ArenaSize = (typeof ARENA_SIZES)[number];
export const PLAN_VERSION = 1;

export type AttemptOutcome = 'succeeded' | 'failed' | 'abandoned';

export interface Attempt {
  difficulty: DifficultyBand;
  outcome: AttemptOutcome;
  hintsUsed: number;
  /** ISO time the attempt started. */
  at: string;
}

export interface GameHistory {
  gameId: string;
  /** Finished attempts, newest first. */
  attempts: readonly Attempt[];
}

export interface ArenaCandidate {
  id: string;
  title: string;
  worldId: WorldId;
  worldTitle: string;
}

export type PickKind = 'comfort' | 'novelty' | 'variety';

export interface DailyPick {
  slot: number;
  gameId: string;
  difficulty: DifficultyBand;
  /** Level seed; unique per day and slot so the puzzle is the same all day. */
  seed: string;
  kind: PickKind;
  /** Why this game was picked, e.g. "New for you". */
  reason: string;
  /** Why this difficulty, e.g. "Stepping up: 3 of your last 4 at Easy solved". */
  levelReason: string;
  minutes: number;
}

export interface DailyPlan {
  version: number;
  date: string;
  size: ArenaSize;
  picks: readonly DailyPick[];
  /** Times each slot was swapped; part of the seed so swaps get fresh puzzles. */
  swaps: readonly number[];
  /** Games swapped away today; not offered again until tomorrow. */
  skipped: readonly string[];
}

const BAND_NAME: Record<DifficultyBand, string> = { intro: 'Intro', easy: 'Easy', standard: 'Standard', advanced: 'Advanced', expert: 'Expert' };
const MINUTES: Record<DifficultyBand, number> = { intro: 2, easy: 3, standard: 4, advanced: 5, expert: 6 };

/** Local calendar date as YYYY-MM-DD (the Arena day follows the player's clock). */
export function localDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function daysBetween(fromIso: string, toDate: string): number {
  const a = new Date(`${localDate(fromIso)}T00:00:00`);
  const b = new Date(`${toDate}T00:00:00`);
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

export interface BandChoice {
  band: DifficultyBand;
  reason: string;
}

/**
 * Difficulty for the next arena level of one game.
 * - No history: Intro.
 * - Promote one band after at least 3 of the last 4 at the current band were solved with few hints.
 * - Ease off one band only after 2 of the last 3 at the current band were missed or left.
 * - Cooldown: no change while the band changed within the last 2 attempts.
 */
export function chooseBand(history: GameHistory | undefined): BandChoice {
  const attempts = history?.attempts ?? [];
  if (!attempts.length) return { band: 'intro', reason: 'Starting gently at Intro' };
  const current = attempts[0]!.difficulty;
  const name = BAND_NAME[current];
  const atCurrent = attempts.filter((a) => a.difficulty === current);
  const recentChange = attempts.slice(0, 3).some((a) => a.difficulty !== current);
  if (recentChange) return { band: current, reason: `Settling in at ${name}` };
  const index = DIFFICULTY_BANDS.indexOf(current);
  const last4 = atCurrent.slice(0, 4);
  const solved = last4.filter((a) => a.outcome === 'succeeded');
  const hintLight = solved.filter((a) => a.hintsUsed <= 1).length;
  if (last4.length >= 3 && solved.length >= 3 && hintLight >= 3 && index < DIFFICULTY_BANDS.length - 1) {
    const next = DIFFICULTY_BANDS[index + 1]!;
    return { band: next, reason: `Stepping up to ${BAND_NAME[next]}: ${solved.length} of your last ${last4.length} at ${name} solved` };
  }
  const last3 = atCurrent.slice(0, 3);
  const missed = last3.filter((a) => a.outcome !== 'succeeded').length;
  if (last3.length >= 3 && missed >= 2 && index > 0) {
    const prev = DIFFICULTY_BANDS[index - 1]!;
    return { band: prev, reason: `A gentler ${BAND_NAME[prev]} level after a tricky run` };
  }
  return { band: current, reason: `Your current level: ${name}` };
}

interface Scored {
  c: ArenaCandidate;
  played: number;
  solved: number;
  solveRate: number;
  daysSince: number | null;
  score: number;
}

export interface PlanInput {
  date: string;
  /** Stable per-player seed (the local profile id). */
  playerSeed: string;
  size: ArenaSize;
  candidates: readonly ArenaCandidate[];
  histories: ReadonlyMap<string, GameHistory>;
  /** Game ids in yesterday's plan, to avoid repeating them. */
  yesterday?: ReadonlySet<string>;
  /** Picks to keep as they are (for example when the size changes mid-day). */
  keep?: readonly DailyPick[];
  swaps?: readonly number[];
  /** Games the player swapped away today; never re-offered today. */
  exclude?: ReadonlySet<string>;
}

const seedFor = (date: string, slot: number, swaps: number) => `daily-${date}-${slot}${swaps ? `-s${swaps}` : ''}`;

export function planDaily(input: PlanInput): DailyPlan {
  const { date, size, candidates, histories } = input;
  const swaps = Array.from({ length: size }, (_, i) => input.swaps?.[i] ?? 0);
  const keep = (input.keep ?? []).filter((p) => p.slot < size);
  const rng = createRng(`daily/${date}/${input.playerSeed}/${swaps.join('.')}`);
  const taken = new Set(keep.map((p) => p.gameId));
  const pool: Scored[] = candidates
    .filter((c) => !taken.has(c.id) && !input.exclude?.has(c.id))
    .map((c) => {
      const attempts = histories.get(c.id)?.attempts ?? [];
      const solved = attempts.filter((a) => a.outcome === 'succeeded').length;
      const daysSince = attempts[0] ? daysBetween(attempts[0].at, date) : null;
      let score = rng.next() * 0.3;
      if (input.yesterday?.has(c.id)) score -= 1.5;
      if (daysSince !== null && daysSince <= 0) score -= 0.8;
      return { c, played: attempts.length, solved, solveRate: attempts.length ? solved / attempts.length : 0, daysSince, score };
    })
    .sort((a, b) => b.score - a.score);

  const picks: DailyPick[] = [...keep];
  const worldsUsed = new Set(keep.map((p) => candidates.find((c) => c.id === p.gameId)?.worldId));
  const freeSlots = Array.from({ length: size }, (_, i) => i).filter((i) => !picks.some((p) => p.slot === i));
  const kindsHave = new Set(picks.map((p) => p.kind));

  const take = (slot: number, kind: PickKind, choose: (s: Scored) => boolean, rank: (a: Scored, b: Scored) => number) => {
    const fresh = pool.filter((s) => choose(s) && !worldsUsed.has(s.c.worldId));
    const any = pool.filter(choose);
    const best = [...(fresh.length ? fresh : any)].sort(rank)[0];
    if (!best) return false;
    pool.splice(pool.indexOf(best), 1);
    worldsUsed.add(best.c.worldId);
    const band = chooseBand(histories.get(best.c.id));
    const reason =
      kind === 'comfort'
        ? `A favourite: ${best.solved} solved`
        : kind === 'novelty'
          ? best.played === 0
            ? 'New for you'
            : `Only tried ${best.played === 1 ? 'once' : `${best.played} times`} so far`
          : best.daysSince === null
            ? `Something from ${best.c.worldTitle}`
            : `From ${best.c.worldTitle}, last played ${best.daysSince <= 0 ? 'today' : best.daysSince === 1 ? 'yesterday' : `${best.daysSince} days ago`}`;
    picks.push({ slot, gameId: best.c.id, difficulty: band.band, seed: seedFor(date, slot, swaps[slot]!), kind, reason, levelReason: band.reason, minutes: MINUTES[band.band] });
    kindsHave.add(kind);
    return true;
  };

  for (const slot of freeSlots) {
    // At least one comfortable choice and one new one when the pool allows (Adaptive_Recommendation.md).
    if (!kindsHave.has('comfort') && take(slot, 'comfort', (s) => s.solved >= 2 && s.solveRate >= 0.6, (a, b) => b.solved - a.solved || b.score - a.score)) continue;
    if (!kindsHave.has('novelty') && take(slot, 'novelty', (s) => s.played <= 1, (a, b) => a.played - b.played || b.score - a.score)) continue;
    take(slot, 'variety', () => true, (a, b) => b.score - a.score);
  }
  picks.sort((a, b) => a.slot - b.slot);
  return { version: PLAN_VERSION, date, size, picks, swaps, skipped: [...(input.exclude ?? [])] };
}

/** Replace one slot with a different game, keeping the others. The swapped-out game is not offered again today. */
export function swapPick(plan: DailyPlan, slot: number, input: Omit<PlanInput, 'date' | 'size' | 'keep' | 'swaps' | 'exclude'>): DailyPlan {
  const old = plan.picks.find((p) => p.slot === slot);
  if (!old) return plan;
  const swaps = plan.swaps.map((n, i) => (i === slot ? n + 1 : n));
  const keep = plan.picks.filter((p) => p.slot !== slot);
  const exclude = new Set([...plan.skipped, old.gameId]);
  const out = planDaily({ ...input, date: plan.date, size: plan.size, keep, swaps, exclude });
  // No other game available: keep the original pick.
  return out.picks.some((p) => p.slot === slot) ? out : plan;
}

/** Change the number of puzzles for today, keeping the picks that remain. */
export function resizePlan(plan: DailyPlan, size: ArenaSize, input: Omit<PlanInput, 'date' | 'size' | 'keep' | 'swaps' | 'exclude'>): DailyPlan {
  if (size === plan.size) return plan;
  const swaps = Array.from({ length: size }, (_, i) => plan.swaps[i] ?? 0);
  return planDaily({ ...input, date: plan.date, size, keep: plan.picks.filter((p) => p.slot < size), swaps, exclude: new Set(plan.skipped) });
}

export const totalMinutes = (plan: DailyPlan) => plan.picks.reduce((s, p) => s + p.minutes, 0);
export const bandName = (b: DifficultyBand) => BAND_NAME[b];

/** Validates a stored plan; anything unexpected means "make a new one". */
export function parsePlan(raw: string | null | undefined, date: string): DailyPlan | null {
  if (!raw) return null;
  try {
    const p = JSON.parse(raw) as DailyPlan;
    if (p.version !== PLAN_VERSION || p.date !== date || !ARENA_SIZES.includes(p.size) || !Array.isArray(p.picks) || !Array.isArray(p.swaps) || !Array.isArray(p.skipped)) return null;
    if (p.picks.some((x) => typeof x.gameId !== 'string' || typeof x.seed !== 'string' || !DIFFICULTY_BANDS.includes(x.difficulty))) return null;
    return p;
  } catch {
    return null;
  }
}

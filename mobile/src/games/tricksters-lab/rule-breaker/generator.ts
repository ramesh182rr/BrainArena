import type { DifficultyBand } from '@/game-runtime/contracts';
import { createRng, type Rng } from '@/game-runtime/rng';

import { causes, hiddenRuleKinds, observe, passes, ruleSpace, sameSpecimen, UNIVERSE } from './rules';
import type { Rule, RuleBreakerState, Specimen } from './types';

export interface LabProfile {
  trayCount: number;
  /** Specimens added for variety that narrow the rule little; skipping them earns the efficiency bonus. */
  decoys: number;
  minPar: number;
}

/**
 * Rule forms grow per band (see `hiddenRuleKinds`), and so does the space of
 * rules the player must reason over; trays grow with them.
 */
export const LAB_PROFILES: Readonly<Record<DifficultyBand, LabProfile>> = {
  intro: { trayCount: 5, decoys: 1, minPar: 2 },
  easy: { trayCount: 6, decoys: 1, minPar: 2 },
  standard: { trayCount: 8, decoys: 2, minPar: 2 },
  advanced: { trayCount: 9, decoys: 2, minPar: 2 },
  expert: { trayCount: 10, decoys: 2, minPar: 3 },
};

export const EXAM_SIZE = 6;
export const EXAM_BATCHES = 3;
const MAX_ATTEMPTS = 200;

export class LabGenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LabGenerationError';
  }
}

/**
 * For each candidate rule, a bitmask of tray items whose observed result it
 * reproduces (pass/fail and deciding properties). A subset S of tests is
 * consistent with rule r exactly when (mask[r] & S) === S.
 */
function consistencyMasks(space: readonly Rule[], truth: Rule, tray: readonly Specimen[]): number[] {
  const observed = tray.map((s) => observe(truth, s));
  return space.map((r) =>
    observed.reduce((mask, o, i) => {
      const c = causes(r, o.specimen);
      const same = passes(r, o.specimen) === o.pass && c.length === o.causes.length && c.every((p, k) => p === o.causes[k]);
      return same ? mask | (1 << i) : mask;
    }, 0),
  );
}

/** Rules (by index) still consistent after testing the tray items in `subset`. */
function candidatesFor(masks: readonly number[], subset: number): number[] {
  const out: number[] = [];
  masks.forEach((m, i) => {
    if ((m & subset) === subset) out.push(i);
  });
  return out;
}

function agreeOn(space: readonly Rule[], candidates: readonly number[], items: readonly Specimen[]): boolean {
  return items.every((s) => {
    const first = passes(space[candidates[0]!]!, s);
    return candidates.every((i) => passes(space[i]!, s) === first);
  });
}

/** Fewest tray tests that force every answer in `exam`, or null if the whole tray cannot. */
export function minimumTests(space: readonly Rule[], truth: Rule, tray: readonly Specimen[], exam: readonly Specimen[]): number | null {
  const masks = consistencyMasks(space, truth, tray);
  const n = tray.length;
  let best: number | null = null;
  for (let subset = 0; subset < 1 << n; subset += 1) {
    const size = popcount(subset);
    if (best !== null && size >= best) continue;
    if (agreeOn(space, candidatesFor(masks, subset), exam)) best = size;
  }
  return best;
}

function popcount(x: number): number {
  let c = 0;
  for (let v = x; v; v &= v - 1) c += 1;
  return c;
}

/** Specimens outside the tray whose result the full tray evidence forces. */
export function determinedPool(space: readonly Rule[], truth: Rule, tray: readonly Specimen[]): Specimen[] {
  const masks = consistencyMasks(space, truth, tray);
  const all = (1 << tray.length) - 1;
  const cands = candidatesFor(masks, all);
  return UNIVERSE.filter((s) => !tray.some((t) => sameSpecimen(t, s)) && agreeOn(space, cands, [s]));
}

/** Exam batches drawn from the determined pool, each with at least one pass and one fail. */
export function buildExams(rng: Rng, truth: Rule, pool: readonly Specimen[]): Specimen[][] | null {
  const passing = rng.shuffle(pool.filter((s) => passes(truth, s)));
  const failing = rng.shuffle(pool.filter((s) => !passes(truth, s)));
  if (passing.length === 0 || failing.length === 0 || pool.length < EXAM_SIZE) return null;
  const batches: Specimen[][] = [];
  for (let b = 0; b < EXAM_BATCHES; b += 1) {
    // Roughly balanced; reuse across batches is allowed when the pool is small.
    const wantPass = Math.min(passing.length, rng.int(2, 4));
    const batch = [
      ...Array.from({ length: wantPass }, (_, i) => passing[(b * 3 + i) % passing.length]!),
      ...Array.from({ length: EXAM_SIZE - wantPass }, (_, i) => failing[(b * 4 + i) % failing.length]!),
    ];
    const unique = batch.filter((s, i) => batch.findIndex((t) => sameSpecimen(t, s)) === i);
    if (unique.length < 4) return null;
    batches.push(rng.shuffle(unique));
  }
  return batches;
}

export function assembleState(
  band: DifficultyBand,
  rule: Rule,
  tray: readonly Specimen[],
  exams: readonly (readonly Specimen[])[],
  par: number,
): RuleBreakerState {
  return {
    band,
    rule,
    tray,
    tested: [],
    revealed: [],
    exams,
    examIndex: 0,
    phase: 'lab',
    failedExams: 0,
    lastExam: null,
    solved: false,
    par,
  };
}

/** Worst-case number of candidates left after observing `s`, over the outcomes candidates predict. */
function worstCaseLeft(candidates: readonly Rule[], s: Specimen): number {
  const groups = new Map<string, number>();
  for (const r of candidates) {
    const key = `${passes(r, s)}:${causes(r, s).join(',')}`;
    groups.set(key, (groups.get(key) ?? 0) + 1);
  }
  return Math.max(...groups.values());
}

/**
 * Builds an informative tray: two passes and two fails, then repeatedly the
 * specimen that narrows the candidates most (chosen among the best few for
 * variety), then a decoy or two that add little, so test choice matters.
 */
function designTray(rng: Rng, space: readonly Rule[], rule: Rule, count: number, decoys: number): Specimen[] | null {
  const passing = UNIVERSE.filter((s) => passes(rule, s));
  const failing = UNIVERSE.filter((s) => !passes(rule, s));
  if (passing.length < 2 || failing.length < 2) return null;
  const [p1, p2] = rng.shuffle(passing);
  const [f1, f2] = rng.shuffle(failing);
  const tray: Specimen[] = [p1!, p2!, f1!, f2!];
  let candidates = space.filter((r) => tray.every((s) => consistentWith(r, rule, s)));
  while (tray.length < count - decoys) {
    const options = UNIVERSE.filter((s) => !tray.some((t) => sameSpecimen(t, s)))
      .map((s) => ({ s, left: worstCaseLeft(candidates, s) }))
      .sort((x, y) => x.left - y.left)
      .slice(0, 3);
    const choice = rng.pick(options).s;
    tray.push(choice);
    candidates = candidates.filter((r) => consistentWith(r, rule, choice));
  }
  const rest = rng.shuffle(UNIVERSE.filter((s) => !tray.some((t) => sameSpecimen(t, s))));
  tray.push(...rest.slice(0, decoys));
  return rng.shuffle(tray);
}

function consistentWith(candidate: Rule, truth: Rule, s: Specimen): boolean {
  if (passes(candidate, s) !== passes(truth, s)) return false;
  const a = causes(candidate, s);
  const b = causes(truth, s);
  return a.length === b.length && a.every((p, i) => p === b[i]);
}

function tryBuild(rng: Rng, band: DifficultyBand, profile: LabProfile): RuleBreakerState | null {
  const space = ruleSpace(band);
  const kind = rng.pick(hiddenRuleKinds(band));
  const rule = rng.pick(ruleSpace('expert').filter((r) => r.k === kind));
  const tray = designTray(rng, space, rule, profile.trayCount, profile.decoys);
  if (!tray) return null;
  const passCount = tray.filter((s) => passes(rule, s)).length;
  if (passCount < 2 || tray.length - passCount < 2) return null;
  const exams = buildExams(rng, rule, determinedPool(space, rule, tray));
  if (!exams) return null;
  const par = minimumTests(space, rule, tray, exams[0]!);
  if (par === null || par < profile.minPar) return null;
  return assembleState(band, rule, tray, exams, par);
}

/** Deterministic for a given `rngKey`. */
export function generateLab(rngKey: string, band: DifficultyBand): RuleBreakerState {
  const rng = createRng(rngKey);
  const profile = LAB_PROFILES[band];
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const state = tryBuild(rng, band, profile);
    if (state) return state;
  }
  throw new LabGenerationError('No acceptable lab within the attempt budget');
}

import type { DifficultyBand, GameHint, GameModule, HintTier, PuzzleLevel, ValidationResult } from '@/game-runtime/contracts';
import { createRng, fingerprint, levelSeedKey, type Rng } from '@/game-runtime/rng';

import { OBJECTS } from '../../memory-vault/memory-detective/logic';

/**
 * Hidden Truth (W1-G03): perspective switching.
 *
 * A few objects sit on a small square table. You see it from one side at a
 * time and can walk round it. Statements describe the scene; some depend on
 * where you stand ("left of", "in front of"), others do not. Exactly one
 * statement is true from every side. Find it; cross out the ones you disprove.
 */

export type Statement =
  | { k: 'left'; a: number; b: number }
  | { k: 'front'; a: number; b: number }
  | { k: 'next'; a: number; b: number }
  | { k: 'diagonal'; a: number; b: number }
  | { k: 'line'; a: number; b: number }
  | { k: 'between'; a: number; b: number; c: number }
  | { k: 'corner'; a: number };

export interface TruthState {
  band: DifficultyBand;
  size: number;
  /** Table cells of each object (index = object slot), table coordinates. */
  cells: readonly number[];
  objs: readonly number[];
  views: number;
  statements: readonly Statement[];
  answer: number;
  view: number;
  crossed: boolean[];
  wrongPicks: number;
  solved: boolean;
}

export type TruthAction = { type: 'turn'; dir: 1 | -1 } | { type: 'cross'; statement: number } | { type: 'pick'; statement: number };

export const HIDDEN_TRUTH_ID = 'W1-G03';
export const HIDDEN_TRUTH_VERSION = '1.0.0';
export const SIDES = ['south', 'west', 'north', 'east'] as const;

/** Row/column of a table cell as seen from viewpoint `v` (row grows towards the viewer). */
export function viewRC(size: number, cell: number, v: number): [number, number] {
  const r = Math.floor(cell / size);
  const c = cell % size;
  const n = size - 1;
  switch (((v % 4) + 4) % 4) {
    case 0:
      return [r, c];
    case 1:
      return [c, n - r];
    case 2:
      return [n - r, n - c];
    default:
      return [n - c, r];
  }
}

export function holdsIn(s: Pick<TruthState, 'size' | 'cells'>, st: Statement, v: number): boolean {
  const rc = (i: number) => viewRC(s.size, s.cells[i]!, v);
  const t = (i: number) => [Math.floor(s.cells[i]! / s.size), s.cells[i]! % s.size] as const;
  switch (st.k) {
    case 'left':
      return rc(st.a)[1] < rc(st.b)[1];
    case 'front':
      return rc(st.a)[0] > rc(st.b)[0];
    case 'next': {
      const [ra, ca] = t(st.a);
      const [rb, cb] = t(st.b);
      return Math.abs(ra - rb) + Math.abs(ca - cb) === 1;
    }
    case 'diagonal': {
      const [ra, ca] = t(st.a);
      const [rb, cb] = t(st.b);
      return Math.abs(ra - rb) === 1 && Math.abs(ca - cb) === 1;
    }
    case 'line': {
      const [ra, ca] = t(st.a);
      const [rb, cb] = t(st.b);
      return ra === rb || ca === cb;
    }
    case 'between': {
      const [ra, ca] = t(st.a);
      const [rb, cb] = t(st.b);
      const [rc2, cc] = t(st.c);
      return ra * 2 === rb + rc2 && ca * 2 === cb + cc && (rb === rc2 || cb === cc);
    }
    case 'corner': {
      const [r, c] = t(st.a);
      const n = s.size - 1;
      return (r === 0 || r === n) && (c === 0 || c === n);
    }
  }
}

export const alwaysTrue = (s: Pick<TruthState, 'size' | 'cells' | 'views'>, st: Statement) => Array.from({ length: s.views }, (_, i) => i * (4 / s.views)).every((v) => holdsIn(s, st, v));

export function statementText(s: Pick<TruthState, 'objs'>, st: Statement): string {
  const n = (i: number) => `the ${OBJECTS[s.objs[i]!]}`;
  const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
  switch (st.k) {
    case 'left':
      return `${cap(n(st.a))} is to the left of ${n(st.b)}.`;
    case 'front':
      return `${cap(n(st.a))} is in front of ${n(st.b)}.`;
    case 'next':
      return `${cap(n(st.a))} is right next to ${n(st.b)}.`;
    case 'diagonal':
      return `${cap(n(st.a))} touches ${n(st.b)} corner to corner.`;
    case 'line':
      return `${cap(n(st.a))} is in a straight line with ${n(st.b)}.`;
    case 'between':
      return `${cap(n(st.a))} is exactly between ${n(st.b)} and ${n(st.c)}.`;
    case 'corner':
      return `${cap(n(st.a))} sits on a corner of the table.`;
  }
}

interface Profile {
  size: number;
  objects: number;
  views: number;
  statements: number;
  invariantKinds: readonly Statement['k'][];
}

export const TRUTH_PROFILES: Readonly<Record<DifficultyBand, Profile>> = {
  intro: { size: 3, objects: 3, views: 2, statements: 3, invariantKinds: ['next', 'corner'] },
  easy: { size: 3, objects: 3, views: 4, statements: 3, invariantKinds: ['next', 'corner', 'diagonal'] },
  standard: { size: 3, objects: 4, views: 4, statements: 4, invariantKinds: ['next', 'corner', 'diagonal', 'line'] },
  advanced: { size: 3, objects: 4, views: 4, statements: 5, invariantKinds: ['next', 'diagonal', 'line', 'between'] },
  expert: { size: 4, objects: 5, views: 4, statements: 5, invariantKinds: ['next', 'diagonal', 'line', 'between', 'corner'] },
};

function randomStatement(rng: Rng, kind: Statement['k'], objects: number): Statement {
  const [a, b, c] = rng.shuffle(Array.from({ length: objects }, (_, i) => i)) as [number, number, number];
  if (kind === 'corner') return { k: kind, a };
  if (kind === 'between') return { k: kind, a, b, c };
  return { k: kind, a, b };
}

function tryBuild(rng: Rng, band: DifficultyBand, p: Profile): TruthState | null {
  const cells = rng.shuffle(Array.from({ length: p.size * p.size }, (_, i) => i)).slice(0, p.objects);
  const objs = rng.shuffle(Array.from({ length: OBJECTS.length }, (_, i) => i)).slice(0, p.objects);
  const base = { size: p.size, cells, views: p.views };
  const seen = new Set<string>();
  const key = (st: Statement) => JSON.stringify(st);
  // The answer: a true view-independent statement.
  let answer: Statement | null = null;
  for (let i = 0; i < 40 && !answer; i += 1) {
    const st = randomStatement(rng, rng.pick(p.invariantKinds), p.objects);
    if (alwaysTrue(base, st)) answer = st;
  }
  if (!answer) return null;
  seen.add(key(answer));
  const decoys: Statement[] = [];
  // Half the decoys are tempting: true from where you start, but not from every side.
  for (let i = 0; i < 200 && decoys.length < p.statements - 1; i += 1) {
    const tempting = decoys.length < Math.ceil((p.statements - 1) / 2);
    const st = randomStatement(rng, tempting ? rng.pick(['left', 'front'] as const) : rng.pick(p.invariantKinds), p.objects);
    if (seen.has(key(st)) || alwaysTrue(base, st)) continue;
    if (tempting && !holdsIn(base, st, 0)) continue;
    seen.add(key(st));
    decoys.push(st);
  }
  if (decoys.length < p.statements - 1) return null;
  const statements = rng.shuffle([answer, ...decoys]);
  return { band, size: p.size, cells, objs, views: p.views, statements, answer: statements.indexOf(answer), view: 0, crossed: statements.map(() => false), wrongPicks: 0, solved: false };
}

export function generateTruth(seedKey: string, band: DifficultyBand, p: Profile = TRUTH_PROFILES[band]): TruthState {
  const rng = createRng(seedKey);
  for (let i = 0; i < 3000; i += 1) {
    const s = tryBuild(rng, band, p);
    if (s) return s;
  }
  throw new Error('No acceptable scene within the attempt budget');
}

export const TRUTH_TUTORIALS = [
  { id: 'tutorial-1', difficulty: 'intro' as const, intro: 'Walk round the table with the arrows. "Left of" changes when you move; "right next to" never does. Which statement is always true?', profile: TRUTH_PROFILES.intro },
  { id: 'tutorial-2', difficulty: 'easy' as const, intro: 'Now you can stand on all four sides. Cross out every statement you see fail from some side.', profile: TRUTH_PROFILES.easy },
  { id: 'tutorial-3', difficulty: 'advanced' as const, intro: '"Exactly between" and "in a straight line" hold from every side when they are true at all.', profile: TRUTH_PROFILES.advanced },
];

export const truthFingerprint = (s: TruthState) => fingerprint(JSON.stringify([s.size, s.cells, s.objs, s.views, s.statements]));
export const statementId = (i: number) => `statement-${i}`;

function toLevel(s: TruthState, seed: string, difficulty: DifficultyBand, source: PuzzleLevel['source'], levelId: string): PuzzleLevel<TruthState> {
  return { gameId: HIDDEN_TRUTH_ID, levelId, generatorVersion: HIDDEN_TRUTH_VERSION, seed, difficulty, source, fingerprint: truthFingerprint(s), initialState: s, metadata: { statements: s.statements.length, views: s.views } };
}

export const hiddenTruth: GameModule<TruthState, TruthAction> = {
  id: HIDDEN_TRUTH_ID,
  version: HIDDEN_TRUTH_VERSION,
  createLevel(seed, difficulty) {
    const t = TRUTH_TUTORIALS.find((x) => x.id === seed);
    if (t) return toLevel(generateTruth(levelSeedKey(HIDDEN_TRUTH_ID, HIDDEN_TRUTH_VERSION, seed), t.difficulty, t.profile), seed, t.difficulty, 'authored', `${HIDDEN_TRUTH_ID}:${seed}`);
    return toLevel(generateTruth(levelSeedKey(HIDDEN_TRUTH_ID, HIDDEN_TRUTH_VERSION, `${seed}/${difficulty}`), difficulty), seed, difficulty, 'generated', `${HIDDEN_TRUTH_ID}:${difficulty}:${seed}`);
  },
  fallbackLevel(difficulty) {
    return toLevel(generateTruth(levelSeedKey(HIDDEN_TRUTH_ID, HIDDEN_TRUTH_VERSION, `curated/${difficulty}`), difficulty), 'curated', difficulty, 'fallback', `${HIDDEN_TRUTH_ID}:fallback-${difficulty}`);
  },
  validateLevel(level): ValidationResult {
    if (level.gameId !== HIDDEN_TRUTH_ID) return { valid: false, reasonCode: 'wrong_game' };
    const s = level.initialState;
    if (s.cells.length !== s.objs.length || new Set(s.cells).size !== s.cells.length || ![2, 4].includes(s.views)) return { valid: false, reasonCode: 'bad_scene' };
    if (s.view || s.wrongPicks || s.solved || s.crossed.some(Boolean)) return { valid: false, reasonCode: 'bad_start' };
    const truths = s.statements.flatMap((st, i) => (alwaysTrue(s, st) ? [i] : []));
    if (truths.length !== 1 || truths[0] !== s.answer) return { valid: false, reasonCode: truths.length ? 'ambiguous' : 'no_truth' };
    if (level.fingerprint !== truthFingerprint(s)) return { valid: false, reasonCode: 'fingerprint_mismatch' };
    return { valid: true, solutionFingerprint: fingerprint(String(s.answer)) };
  },
  reduce(s, a) {
    if (s.solved) return s;
    switch (a.type) {
      case 'turn': {
        const step = 4 / s.views;
        return { ...s, view: (s.view + a.dir * step + 4) % 4 };
      }
      case 'cross': {
        if (!s.statements[a.statement]) return s;
        const crossed = [...s.crossed];
        crossed[a.statement] = !crossed[a.statement];
        return { ...s, crossed };
      }
      case 'pick':
        if (!s.statements[a.statement]) return s;
        if (a.statement === s.answer) return { ...s, solved: true };
        {
          const crossed = [...s.crossed];
          crossed[a.statement] = true;
          return { ...s, wrongPicks: s.wrongPicks + 1, crossed };
        }
      default:
        return s;
    }
  },
  isComplete: (s) => s.solved,
  score: (s, { hintsUsed }) => 100 + Math.max(0, 50 - s.wrongPicks * 20 - hintsUsed * 10),
  hint(s, tier: HintTier): GameHint {
    // Find a decoy and a side from which it fails.
    const decoy = s.statements.findIndex((st, i) => i !== s.answer && !s.crossed[i]);
    if (tier === 1) return { tier, text: 'Statements about left, right, front and behind change as you walk round. Others stay put.', highlightIds: [] };
    if (tier === 2 && decoy >= 0) {
      const views = Array.from({ length: s.views }, (_, i) => i * (4 / s.views));
      const side = views.find((v) => !holdsIn(s, s.statements[decoy]!, v)) ?? 0;
      return { tier, text: `The highlighted statement fails when you view from the ${SIDES[side]}.`, highlightIds: [statementId(decoy)] };
    }
    return { tier, text: 'The highlighted statement is true from every side.', highlightIds: [statementId(s.answer)] };
  },
};

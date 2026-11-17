import type { DifficultyBand, GameHint, GameModule, HintTier, PuzzleLevel, ValidationResult } from '@/game-runtime/contracts';
import { createRng, fingerprint, levelSeedKey } from '@/game-runtime/rng';

import { findAuthoredLab, LAB_FALLBACKS, parseRule, parseTray, type AuthoredLab } from './authored';
import { assembleState, buildExams, determinedPool, generateLab, minimumTests } from './generator';
import {
  consistentRules,
  determines,
  observe,
  passes,
  PROP_LABEL,
  ruleSpace,
  specimenCode,
} from './rules';
import type { Observation, Prop, Rule, RuleBreakerAction, RuleBreakerState } from './types';

export const RULE_BREAKER_ID = 'W1-G05';
/** Bump when the same seed would produce a different lab or rules change. */
export const RULE_BREAKER_VERSION = '1.0.0';

const BASE_SCORE = 100;

export const specimenId = (index: number) => `specimen-${index}`;

export function labFingerprint(state: Pick<RuleBreakerState, 'band' | 'rule' | 'tray' | 'exams'>): string {
  return fingerprint(JSON.stringify([state.band, state.rule, state.tray.map(specimenCode), state.exams.map((b) => b.map(specimenCode))]));
}

/** Everything the player has learned: tray tests plus results revealed by failed tests. */
export function evidence(state: RuleBreakerState): Observation[] {
  return [...state.tested.map((i) => observe(state.rule, state.tray[i]!)), ...state.revealed];
}

export function currentExam(state: RuleBreakerState) {
  return state.exams[state.examIndex % state.exams.length] ?? [];
}

function ruleProps(rule: Rule): Prop[] {
  switch (rule.k) {
    case 'marksAtLeast':
    case 'marksAtMost':
      return ['marks'];
    case 'is':
    case 'isNot':
      return [rule.a.p];
    default:
      return [rule.a.p, rule.b.p];
  }
}

function ruleShapeHint(rule: Rule): string {
  const label = (p: Prop) => (p === 'marks' ? 'number of marks' : PROP_LABEL[p]);
  switch (rule.k) {
    case 'is':
      return `Specimens pass when their ${label(rule.a.p)} is one particular value.`;
    case 'isNot':
      return `Specimens pass unless their ${label(rule.a.p)} is one particular value.`;
    case 'marksAtLeast':
      return 'Specimens pass when they have at least a certain number of marks.';
    case 'marksAtMost':
      return 'Specimens pass when they have at most a certain number of marks.';
    case 'and':
      return `To pass, a specimen needs a certain ${label(rule.a.p)} AND a certain ${label(rule.b.p)}.`;
    case 'or':
      return `A specimen passes with a certain ${label(rule.a.p)} OR a certain ${label(rule.b.p)}.`;
    case 'andNot':
      return `To pass, a specimen needs a certain ${label(rule.a.p)}, but NOT a certain ${label(rule.b.p)}.`;
  }
}

function toLevel(state: RuleBreakerState, seed: string, difficulty: DifficultyBand, source: PuzzleLevel['source'], levelId: string): PuzzleLevel<RuleBreakerState> {
  return {
    gameId: RULE_BREAKER_ID,
    levelId,
    generatorVersion: RULE_BREAKER_VERSION,
    seed,
    difficulty,
    source,
    fingerprint: labFingerprint(state),
    initialState: state,
    metadata: { tray: state.tray.length, rule: state.rule.k, par: state.par },
  };
}

function authoredState(lab: AuthoredLab): RuleBreakerState {
  const rule = parseRule(lab.rule);
  const tray = parseTray(lab.tray);
  const space = ruleSpace(lab.difficulty);
  const rng = createRng(levelSeedKey(RULE_BREAKER_ID, RULE_BREAKER_VERSION, lab.id));
  const exams = buildExams(rng, rule, determinedPool(space, rule, tray)) ?? [];
  const par = exams[0] ? (minimumTests(space, rule, tray, exams[0]) ?? 0) : 0;
  return assembleState(lab.difficulty, rule, tray, exams, par);
}

function authoredLevel(lab: AuthoredLab, source: PuzzleLevel['source']): PuzzleLevel<RuleBreakerState> {
  return toLevel(authoredState(lab), lab.id, lab.difficulty, source, `${RULE_BREAKER_ID}:${lab.id}`);
}

function sameRule(a: Rule, b: Rule): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** The untested tray specimen whose result would rule out the most candidates in the worst case. */
function bestExperiment(state: RuleBreakerState, candidates: readonly Rule[]): number | null {
  let best: { index: number; worst: number } | null = null;
  state.tray.forEach((s, index) => {
    if (state.tested.includes(index)) return;
    const groups = new Map<string, number>();
    for (const r of candidates) {
      const o = observe(r, s);
      const key = `${o.pass}:${o.causes.join(',')}`;
      groups.set(key, (groups.get(key) ?? 0) + 1);
    }
    const worst = Math.max(...groups.values());
    if (!best || worst < best.worst) best = { index, worst };
  });
  return (best as { index: number } | null)?.index ?? null;
}

function hintFor(state: RuleBreakerState, tier: HintTier): GameHint {
  const props = ruleProps(state.rule).map((p) => (p === 'marks' ? 'marks' : PROP_LABEL[p]));
  if (tier === 1) {
    return {
      tier,
      text: props.length === 1 ? `The rule only cares about ${props[0]}.` : `The rule involves two properties: ${props[0]} and ${props[1]}.`,
      highlightIds: [],
    };
  }
  if (tier === 2) {
    const candidates = consistentRules(ruleSpace(state.band), evidence(state));
    if (determines(candidates, currentExam(state))) {
      return { tier, text: 'You have enough evidence to answer every question. Take the test!', highlightIds: [] };
    }
    const next = bestExperiment(state, candidates);
    return next === null
      ? { tier, text: 'Compare the specimens that passed with those that failed.', highlightIds: [] }
      : { tier, text: 'Testing the highlighted specimen will tell you the most.', highlightIds: [specimenId(next)] };
  }
  return { tier, text: ruleShapeHint(state.rule), highlightIds: [] };
}

const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);

export const ruleBreaker: GameModule<RuleBreakerState, RuleBreakerAction> = {
  id: RULE_BREAKER_ID,
  version: RULE_BREAKER_VERSION,

  createLevel(seed, difficulty) {
    const authored = findAuthoredLab(seed);
    if (authored) return authoredLevel(authored, 'authored');
    const key = levelSeedKey(RULE_BREAKER_ID, RULE_BREAKER_VERSION, `${seed}/${difficulty}`);
    return toLevel(generateLab(key, difficulty), seed, difficulty, 'generated', `${RULE_BREAKER_ID}:${difficulty}:${seed}`);
  },

  fallbackLevel(difficulty) {
    return { ...authoredLevel(LAB_FALLBACKS[difficulty], 'fallback'), difficulty };
  },

  validateLevel(level): ValidationResult {
    if (level.gameId !== RULE_BREAKER_ID) return { valid: false, reasonCode: 'wrong_game' };
    const s = level.initialState;
    if (s.tray.length < 3 || s.tray.length > 12) return { valid: false, reasonCode: 'bad_tray' };
    if (s.tested.length || s.revealed.length || s.phase !== 'lab' || s.solved || s.examIndex !== 0) return { valid: false, reasonCode: 'bad_start' };
    const space = ruleSpace(s.band);
    if (!space.some((r) => sameRule(r, s.rule))) return { valid: false, reasonCode: 'rule_outside_band' };
    if (s.exams.length === 0) return { valid: false, reasonCode: 'no_exam' };
    const all = consistentRules(space, s.tray.map((sp) => observe(s.rule, sp)));
    for (const batch of s.exams) {
      if (batch.length < 4) return { valid: false, reasonCode: 'exam_too_small' };
      if (!batch.some((x) => passes(s.rule, x)) || batch.every((x) => passes(s.rule, x))) return { valid: false, reasonCode: 'exam_unbalanced' };
      if (!determines(all, batch)) return { valid: false, reasonCode: 'exam_undetermined' };
    }
    const par = minimumTests(space, s.rule, s.tray, s.exams[0]!);
    if (par !== s.par) return { valid: false, reasonCode: 'par_mismatch' };
    if (level.fingerprint !== labFingerprint(s)) return { valid: false, reasonCode: 'fingerprint_mismatch' };
    return { valid: true, solutionFingerprint: fingerprint(JSON.stringify(s.rule)) };
  },

  reduce(state, action) {
    if (state.solved) return state;
    switch (action.type) {
      case 'test': {
        if (state.phase !== 'lab' || !isInt(action.index) || !state.tray[action.index] || state.tested.includes(action.index)) return state;
        return { ...state, tested: [...state.tested, action.index] };
      }
      case 'startExam':
        return state.phase === 'lab' ? { ...state, phase: 'exam', lastExam: null } : state;
      case 'backToLab':
        return state.phase === 'exam' ? { ...state, phase: 'lab' } : state;
      case 'submitExam': {
        const exam = currentExam(state);
        if (state.phase !== 'exam' || action.answers.length !== exam.length) return state;
        const correct = exam.map((s, i) => passes(state.rule, s) === action.answers[i]);
        const result = { answers: [...action.answers], correct };
        if (correct.every(Boolean)) return { ...state, solved: true, lastExam: result };
        return {
          ...state,
          phase: 'lab',
          failedExams: state.failedExams + 1,
          examIndex: state.examIndex + 1,
          lastExam: result,
          revealed: [...state.revealed, ...exam.map((s) => observe(state.rule, s))],
        };
      }
      default:
        return state;
    }
  },

  isComplete: (state) => state.solved,

  /**
   * Passing the test earns the base score. The bonus rewards needing few
   * experiments; hints and failed tests reduce only the bonus. Time is never scored.
   */
  score(state, { hintsUsed }) {
    const extra = state.tested.length - state.par;
    const bonus = extra <= 0 ? 50 : extra <= 2 ? 30 : 15;
    return BASE_SCORE + Math.max(0, bonus - hintsUsed * 10 - state.failedExams * 15);
  },

  hint: hintFor,
};

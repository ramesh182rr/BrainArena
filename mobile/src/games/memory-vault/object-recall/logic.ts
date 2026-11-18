import type { DifficultyBand, GameHint, GameModule, HintTier, PuzzleLevel, ValidationResult } from '@/game-runtime/contracts';
import { createRng, fingerprint, levelSeedKey, type Rng } from '@/game-runtime/rng';

import { OBJECTS } from '../memory-detective/logic';

/**
 * Object Recall (W5-G02): recall in context.
 *
 * A tiny story plays out card by card: characters put objects in places and
 * move them around. After a short distraction (tap the bigger number), answer
 * questions about where things ended up, who moved what, and what happened
 * first. Most answers right clears the round; a miss reviews every answer and
 * tells a fresh story.
 */

export const PEOPLE = ['Mo', 'Lin', 'Pip'] as const;
export const PLACES = ['drawer', 'shelf', 'box', 'bag', 'basket'] as const;

export type StoryEvent = { k: 'put'; who: number; obj: number; place: number } | { k: 'move'; who: number; obj: number; from: number; to: number };

export type Question =
  | { k: 'where'; obj: number; answer: number; options: number[] }
  | { k: 'who'; obj: number; answer: number; options: number[] }
  | { k: 'first'; a: number; b: number; answer: number; options: number[] };

export interface RoundSpec {
  events: number;
  questions: number;
  objects: number;
  places: number;
  people: number;
}

export interface RecallResult {
  passed: boolean;
  correct: number;
  total: number;
  answers: number[];
}

export interface RecallState {
  band: DifficultyBand;
  rounds: readonly RoundSpec[];
  seed: string;
  round: number;
  attempt: number;
  story: readonly StoryEvent[];
  questions: readonly Question[];
  breakTask: readonly [number, number][];
  phase: 'ready' | 'story' | 'break' | 'quiz' | 'feedback';
  card: number;
  breakIndex: number;
  answers: number[];
  misses: number;
  correctTotal: number;
  questionTotal: number;
  lastResult: RecallResult | null;
  done: boolean;
}

export type RecallAction = { type: 'begin' } | { type: 'next' } | { type: 'breakTap'; side: 0 | 1 } | { type: 'answer'; option: number };

export const OBJECT_RECALL_ID = 'W5-G02';
export const OBJECT_RECALL_VERSION = '1.0.0';

export function eventText(e: StoryEvent): string {
  return e.k === 'put' ? `${PEOPLE[e.who]} puts the ${OBJECTS[e.obj]} in the ${PLACES[e.place]}.` : `${PEOPLE[e.who]} moves the ${OBJECTS[e.obj]} from the ${PLACES[e.from]} to the ${PLACES[e.to]}.`;
}

export function questionText(q: Question): string {
  if (q.k === 'where') return `Where is the ${OBJECTS[q.obj]} now?`;
  if (q.k === 'who') return `Who last handled the ${OBJECTS[q.obj]}?`;
  return `Which was put away first?`;
}

export function optionText(q: Question, o: number): string {
  if (q.k === 'where') return `the ${PLACES[o]}`;
  if (q.k === 'who') return PEOPLE[o]!;
  return `the ${OBJECTS[o]}`;
}

function sample<T>(rng: Rng, items: readonly T[], n: number): T[] {
  return rng.shuffle([...items]).slice(0, n);
}

/** Builds one round's story, questions and distraction pairs. */
export function storyFor(s: Pick<RecallState, 'seed' | 'rounds'>, round: number, attempt: number): Pick<RecallState, 'story' | 'questions' | 'breakTask'> {
  const rng = createRng(`${s.seed}/${round}/${attempt}`);
  const spec = s.rounds[round]!;
  for (;;) {
    const objs = sample(rng, Array.from({ length: OBJECTS.length }, (_, i) => i), spec.objects);
    const places = sample(rng, Array.from({ length: PLACES.length }, (_, i) => i), spec.places);
    const where = new Map<number, number>();
    const lastWho = new Map<number, number>();
    const putOrder: number[] = [];
    const story: StoryEvent[] = [];
    for (const obj of objs) {
      const e: StoryEvent = { k: 'put', who: rng.int(0, spec.people - 1), obj, place: rng.pick(places) };
      story.push(e);
      where.set(obj, e.place);
      lastWho.set(obj, e.who);
      putOrder.push(obj);
    }
    while (story.length < spec.events) {
      const obj = rng.pick(objs);
      const from = where.get(obj)!;
      const to = rng.pick(places.filter((p) => p !== from));
      const e: StoryEvent = { k: 'move', who: rng.int(0, spec.people - 1), obj, from, to };
      story.push(e);
      where.set(obj, to);
      lastWho.set(obj, e.who);
    }
    const questions: Question[] = [];
    const moved = objs.filter((o) => story.some((e) => e.k === 'move' && e.obj === o));
    const kinds = rng.shuffle(['where', 'who', 'first', 'where'] as const);
    for (const k of kinds) {
      if (questions.length >= spec.questions) break;
      if (k === 'where') {
        const obj = rng.pick(moved.length ? moved : objs);
        if (questions.some((q) => q.k === 'where' && q.obj === obj)) continue;
        const answer = where.get(obj)!;
        questions.push({ k, obj, answer, options: rng.shuffle([answer, ...sample(rng, places.filter((p) => p !== answer), Math.min(2, places.length - 1))]) });
      } else if (k === 'who' && spec.people > 1) {
        const obj = rng.pick(objs);
        const answer = lastWho.get(obj)!;
        questions.push({ k, obj, answer, options: Array.from({ length: spec.people }, (_, i) => i) });
      } else if (k === 'first' && objs.length >= 2) {
        const [a, b] = sample(rng, objs, 2) as [number, number];
        const answer = putOrder.indexOf(a) < putOrder.indexOf(b) ? a : b;
        questions.push({ k, a, b, answer, options: rng.shuffle([a, b]) });
      }
    }
    if (questions.length < spec.questions) continue;
    const breakTask = Array.from({ length: 3 }, () => {
      const x = rng.int(12, 89);
      let y = rng.int(12, 89);
      if (y === x) y += 1;
      return [x, y] as [number, number];
    });
    return { story, questions, breakTask };
  }
}

interface Profile {
  rounds: RoundSpec[];
}

export const RECALL_PROFILES: Readonly<Record<DifficultyBand, Profile>> = {
  intro: { rounds: [{ events: 3, questions: 2, objects: 2, places: 3, people: 1 }, { events: 3, questions: 2, objects: 2, places: 3, people: 2 }] },
  easy: { rounds: [{ events: 4, questions: 2, objects: 3, places: 3, people: 2 }, { events: 4, questions: 3, objects: 3, places: 3, people: 2 }] },
  standard: { rounds: [{ events: 5, questions: 3, objects: 3, places: 4, people: 2 }, { events: 5, questions: 3, objects: 3, places: 4, people: 3 }, { events: 6, questions: 3, objects: 4, places: 4, people: 3 }] },
  advanced: { rounds: [{ events: 6, questions: 3, objects: 4, places: 4, people: 3 }, { events: 7, questions: 4, objects: 4, places: 5, people: 3 }, { events: 7, questions: 4, objects: 4, places: 5, people: 3 }] },
  expert: { rounds: [{ events: 7, questions: 4, objects: 4, places: 5, people: 3 }, { events: 8, questions: 4, objects: 5, places: 5, people: 3 }, { events: 9, questions: 4, objects: 5, places: 5, people: 3 }] },
};

export const RECALL_TUTORIALS = [
  { id: 'tutorial-1', difficulty: 'intro' as const, intro: 'Read the little story one card at a time. After a quick break, answer where things ended up.', profile: { rounds: [{ events: 2, questions: 1, objects: 1, places: 2, people: 1 }] } },
  { id: 'tutorial-2', difficulty: 'easy' as const, intro: 'Objects get moved. Keep track of where each one is now, and who touched it last.', profile: { rounds: [{ events: 4, questions: 2, objects: 2, places: 3, people: 2 }] } },
  { id: 'tutorial-3', difficulty: 'standard' as const, intro: 'Order questions too: which object was put away first?', profile: { rounds: [{ events: 5, questions: 3, objects: 3, places: 3, people: 2 }] } },
];

export const passMark = (n: number) => (n <= 2 ? n : n - 1);

function load(s: Omit<RecallState, 'story' | 'questions' | 'breakTask'>): Pick<RecallState, 'story' | 'questions' | 'breakTask' | 'card' | 'breakIndex' | 'answers'> {
  return { ...storyFor(s, s.round, s.attempt), card: 0, breakIndex: 0, answers: [] };
}

export function buildRecall(band: DifficultyBand, seed: string, p: Profile): RecallState {
  const base = { band, rounds: p.rounds, seed, round: 0, attempt: 0, phase: 'ready' as const, card: 0, breakIndex: 0, answers: [], misses: 0, correctTotal: 0, questionTotal: 0, lastResult: null, done: false };
  return { ...base, ...load(base) };
}

export const recallFingerprint = (s: RecallState) => fingerprint(JSON.stringify([s.rounds, s.seed]));
export const optionId = (i: number) => `option-${i}`;

function toLevel(s: RecallState, seed: string, difficulty: DifficultyBand, source: PuzzleLevel['source'], levelId: string): PuzzleLevel<RecallState> {
  return { gameId: OBJECT_RECALL_ID, levelId, generatorVersion: OBJECT_RECALL_VERSION, seed, difficulty, source, fingerprint: recallFingerprint(s), initialState: s, metadata: { rounds: s.rounds.length } };
}

/** Replays the story to check a question's stored answer. */
export function checkQuestion(story: readonly StoryEvent[], q: Question): boolean {
  const where = new Map<number, number>();
  const who = new Map<number, number>();
  const order: number[] = [];
  for (const e of story) {
    if (e.k === 'put') {
      where.set(e.obj, e.place);
      order.push(e.obj);
    } else where.set(e.obj, e.to);
    who.set(e.obj, e.who);
  }
  if (!q.options.includes(q.answer) || new Set(q.options).size !== q.options.length) return false;
  if (q.k === 'where') return where.get(q.obj) === q.answer;
  if (q.k === 'who') return who.get(q.obj) === q.answer;
  return q.answer === (order.indexOf(q.a) < order.indexOf(q.b) ? q.a : q.b);
}

export const objectRecall: GameModule<RecallState, RecallAction> = {
  id: OBJECT_RECALL_ID,
  version: OBJECT_RECALL_VERSION,
  createLevel(seed, difficulty) {
    const t = RECALL_TUTORIALS.find((x) => x.id === seed);
    if (t) return toLevel(buildRecall(t.difficulty, levelSeedKey(OBJECT_RECALL_ID, OBJECT_RECALL_VERSION, seed), t.profile), seed, t.difficulty, 'authored', `${OBJECT_RECALL_ID}:${seed}`);
    return toLevel(buildRecall(difficulty, levelSeedKey(OBJECT_RECALL_ID, OBJECT_RECALL_VERSION, `${seed}/${difficulty}`), RECALL_PROFILES[difficulty]), seed, difficulty, 'generated', `${OBJECT_RECALL_ID}:${difficulty}:${seed}`);
  },
  fallbackLevel(difficulty) {
    return toLevel(buildRecall(difficulty, levelSeedKey(OBJECT_RECALL_ID, OBJECT_RECALL_VERSION, `curated/${difficulty}`), RECALL_PROFILES[difficulty]), 'curated', difficulty, 'fallback', `${OBJECT_RECALL_ID}:fallback-${difficulty}`);
  },
  validateLevel(level): ValidationResult {
    if (level.gameId !== OBJECT_RECALL_ID) return { valid: false, reasonCode: 'wrong_game' };
    const s = level.initialState;
    if (!s.rounds.length || s.rounds.some((r) => r.objects > r.events || r.places > PLACES.length || r.people > PEOPLE.length || r.questions < 1)) return { valid: false, reasonCode: 'bad_rounds' };
    for (let r = 0; r < s.rounds.length; r += 1) {
      const st = storyFor(s, r, 0);
      if (st.story.length !== s.rounds[r]!.events || st.questions.length !== s.rounds[r]!.questions || !st.questions.every((q) => checkQuestion(st.story, q))) return { valid: false, reasonCode: 'bad_story' };
    }
    if (s.round || s.attempt || s.phase !== 'ready' || s.misses || s.done || s.answers.length) return { valid: false, reasonCode: 'bad_start' };
    if (level.fingerprint !== recallFingerprint(s)) return { valid: false, reasonCode: 'fingerprint_mismatch' };
    return { valid: true, solutionFingerprint: fingerprint(JSON.stringify(s.questions.map((q) => q.answer))) };
  },
  reduce(s, a) {
    if (s.done) return s;
    switch (a.type) {
      case 'begin':
        // Starts (or restarts after a pause) the story; after a miss it brings a fresh one.
        return s.phase === 'ready' || s.phase === 'feedback' || s.phase === 'story' ? { ...s, ...(s.phase === 'feedback' ? load(s) : {}), phase: 'story', card: 0 } : s;
      case 'next':
        if (s.phase !== 'story') return s;
        return s.card + 1 < s.story.length ? { ...s, card: s.card + 1 } : { ...s, phase: 'break', breakIndex: 0 };
      case 'breakTap': {
        if (s.phase !== 'break') return s;
        // The break only needs doing, not getting right.
        const next = s.breakIndex + 1;
        return next < s.breakTask.length ? { ...s, breakIndex: next } : { ...s, phase: 'quiz', answers: [] };
      }
      case 'answer': {
        if (s.phase !== 'quiz') return s;
        const q = s.questions[s.answers.length];
        if (!q || !q.options.includes(a.option)) return s;
        const answers = [...s.answers, a.option];
        if (answers.length < s.questions.length) return { ...s, answers };
        const correct = s.questions.filter((x, i) => x.answer === answers[i]).length;
        const passed = correct >= passMark(s.questions.length);
        const lastResult = { passed, correct, total: s.questions.length, answers };
        if (!passed) return { ...s, answers, phase: 'feedback', misses: s.misses + 1, attempt: s.attempt + 1, lastResult };
        const totals = { correctTotal: s.correctTotal + correct, questionTotal: s.questionTotal + s.questions.length };
        const next = s.round + 1;
        if (next >= s.rounds.length) return { ...s, ...totals, answers, phase: 'feedback', lastResult, done: true };
        return { ...s, ...totals, answers, phase: 'feedback', round: next, attempt: 0, lastResult };
      }
      default:
        return s;
    }
  },
  isComplete: (s) => s.done,
  score: (s, { hintsUsed }) => 100 + Math.max(0, Math.round(50 * (s.questionTotal ? s.correctTotal / s.questionTotal : 0)) - s.misses * 15 - hintsUsed * 10),
  hint(s, tier: HintTier): GameHint {
    if (s.phase !== 'quiz') return { tier, text: 'Say each card to yourself as a little picture: who, what, where.', highlightIds: [] };
    const q = s.questions[s.answers.length]!;
    if (tier === 1) {
      const related = s.story.filter((e) => (q.k === 'first' ? e.k === 'put' && (e.obj === q.a || e.obj === q.b) : e.obj === q.obj)).length;
      return { tier, text: `${related} card${related === 1 ? '' : 's'} in the story involved ${q.k === 'first' ? 'those objects' : `the ${OBJECTS[q.obj]}`}.`, highlightIds: [] };
    }
    if (tier === 2 && q.options.length > 2) {
      const wrong = q.options.find((o) => o !== q.answer)!;
      return { tier, text: `It is not ${optionText(q, wrong)}.`, highlightIds: [] };
    }
    return { tier, text: 'The highlighted answer is right.', highlightIds: [optionId(q.options.indexOf(q.answer))] };
  },
};

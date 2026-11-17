import type { DifficultyBand } from '@/game-runtime/contracts';

/**
 * Rule Breaker (W1-G05): rule discovery by experiment.
 *
 * A hidden rule decides which specimens pass. The player tests specimens from
 * a tray; each test reports PASS, or FAIL plus which properties caused the
 * failure (not their values). When ready, the player sorts a fresh batch of specimens. All correct
 * solves the level; mistakes become new evidence and the player can continue.
 */

export const SHAPES = ['circle', 'triangle', 'square', 'hexagon'] as const;
export const COLOURS = ['red', 'blue', 'green', 'yellow'] as const;
export const SIZES = ['small', 'large'] as const;
export const MARKS = [1, 2, 3] as const;

export type Shape = (typeof SHAPES)[number];
export type Colour = (typeof COLOURS)[number];
export type Size = (typeof SIZES)[number];
export type Marks = (typeof MARKS)[number];

export interface Specimen {
  shape: Shape;
  colour: Colour;
  size: Size;
  marks: Marks;
}

export type Prop = 'shape' | 'colour' | 'size' | 'marks';
export const PROPS: readonly Prop[] = ['shape', 'colour', 'size', 'marks'];

/** A single "property equals value" test. */
export type Atom =
  | { p: 'shape'; v: Shape }
  | { p: 'colour'; v: Colour }
  | { p: 'size'; v: Size }
  | { p: 'marks'; v: Marks };

export type Rule =
  | { k: 'is'; a: Atom }
  | { k: 'isNot'; a: Atom }
  | { k: 'marksAtLeast'; n: 2 | 3 }
  | { k: 'marksAtMost'; n: 1 | 2 }
  | { k: 'and'; a: Atom; b: Atom }
  | { k: 'or'; a: Atom; b: Atom }
  | { k: 'andNot'; a: Atom; b: Atom };

export interface Observation {
  specimen: Specimen;
  pass: boolean;
  /** Properties that caused a failure, in a stable order; empty for a pass. */
  causes: Prop[];
}

export interface ExamResult {
  answers: boolean[];
  correct: boolean[];
}

export interface RuleBreakerState {
  /** Band whose rule space the player must reason over. */
  band: DifficultyBand;
  rule: Rule;
  tray: readonly Specimen[];
  /** Tray indices tested, in order. */
  tested: readonly number[];
  /** Results revealed from failed exams, which count as extra evidence. */
  revealed: readonly Observation[];
  /** Exam batches; all are fully determined by the tray's evidence. */
  exams: readonly (readonly Specimen[])[];
  examIndex: number;
  phase: 'lab' | 'exam';
  failedExams: number;
  lastExam: ExamResult | null;
  solved: boolean;
  /** Fewest tray tests that determine the first exam. */
  par: number;
}

export type RuleBreakerAction =
  | { type: 'test'; index: number }
  | { type: 'startExam' }
  | { type: 'backToLab' }
  | { type: 'submitExam'; answers: readonly boolean[] };

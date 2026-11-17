import type { DifficultyBand } from '@/game-runtime/contracts';

import {
  COLOURS,
  MARKS,
  PROPS,
  SHAPES,
  SIZES,
  type Atom,
  type Observation,
  type Prop,
  type Rule,
  type Specimen,
} from './types';

/** Every possible specimen: 4 shapes × 4 colours × 2 sizes × 3 marks = 96. */
export const UNIVERSE: readonly Specimen[] = SHAPES.flatMap((shape) =>
  COLOURS.flatMap((colour) => SIZES.flatMap((size) => MARKS.map((marks) => ({ shape, colour, size, marks })))),
);

export const ATOMS: readonly Atom[] = [
  ...SHAPES.map((v) => ({ p: 'shape', v }) as Atom),
  ...COLOURS.map((v) => ({ p: 'colour', v }) as Atom),
  ...SIZES.map((v) => ({ p: 'size', v }) as Atom),
  ...MARKS.map((v) => ({ p: 'marks', v }) as Atom),
];

export const holds = (a: Atom, s: Specimen): boolean => s[a.p] === a.v;

export function passes(rule: Rule, s: Specimen): boolean {
  switch (rule.k) {
    case 'is':
      return holds(rule.a, s);
    case 'isNot':
      return !holds(rule.a, s);
    case 'marksAtLeast':
      return s.marks >= rule.n;
    case 'marksAtMost':
      return s.marks <= rule.n;
    case 'and':
      return holds(rule.a, s) && holds(rule.b, s);
    case 'or':
      return holds(rule.a, s) || holds(rule.b, s);
    case 'andNot':
      return holds(rule.a, s) && !holds(rule.b, s);
  }
}

const order = (props: Prop[]): Prop[] => PROPS.filter((p) => props.includes(p));

/**
 * Which properties caused a FAIL. A pass reports no cause, so the player has
 * to reason across several tests. For combined rules only the parts that went
 * wrong are named, e.g. the failing half of an AND.
 */
export function causes(rule: Rule, s: Specimen): Prop[] {
  if (passes(rule, s)) return [];
  switch (rule.k) {
    case 'is':
    case 'isNot':
      return [rule.a.p];
    case 'marksAtLeast':
    case 'marksAtMost':
      return ['marks'];
    case 'and':
      return order([...(holds(rule.a, s) ? [] : [rule.a.p]), ...(holds(rule.b, s) ? [] : [rule.b.p])]);
    case 'or':
      return order([rule.a.p, rule.b.p]);
    case 'andNot':
      return order([...(holds(rule.a, s) ? [] : [rule.a.p]), ...(holds(rule.b, s) ? [rule.b.p] : [])]);
  }
}

export function observe(rule: Rule, s: Specimen): Observation {
  return { specimen: s, pass: passes(rule, s), causes: causes(rule, s) };
}

export function consistent(rule: Rule, obs: Observation): boolean {
  if (passes(rule, obs.specimen) !== obs.pass) return false;
  const c = causes(rule, obs.specimen);
  return c.length === obs.causes.length && c.every((p, i) => p === obs.causes[i]);
}

function pairs(): [Atom, Atom][] {
  const out: [Atom, Atom][] = [];
  for (let i = 0; i < ATOMS.length; i += 1) {
    for (let j = 0; j < ATOMS.length; j += 1) {
      const a = ATOMS[i]!;
      const b = ATOMS[j]!;
      if (a.p !== b.p) out.push([a, b]);
    }
  }
  return out;
}

const PAIRS = pairs();
const ORDERED_PAIRS = PAIRS.filter(([a, b]) => PROPS.indexOf(a.p) < PROPS.indexOf(b.p));

/**
 * Rules a player must consider at each band. Higher bands include all lower
 * forms, so the player never knows the shape of the rule in advance.
 */
export function ruleSpace(band: DifficultyBand): Rule[] {
  const is = ATOMS.map((a) => ({ k: 'is', a }) as Rule);
  const isNot = ATOMS.map((a) => ({ k: 'isNot', a }) as Rule);
  const counts: Rule[] = [
    { k: 'marksAtLeast', n: 2 },
    { k: 'marksAtLeast', n: 3 },
    { k: 'marksAtMost', n: 1 },
    { k: 'marksAtMost', n: 2 },
  ];
  const and = ORDERED_PAIRS.map(([a, b]) => ({ k: 'and', a, b }) as Rule);
  const or = ORDERED_PAIRS.map(([a, b]) => ({ k: 'or', a, b }) as Rule);
  const andNot = PAIRS.map(([a, b]) => ({ k: 'andNot', a, b }) as Rule);
  switch (band) {
    case 'intro':
      return is;
    case 'easy':
      return [...is, ...isNot];
    case 'standard':
      return [...is, ...isNot, ...counts, ...and];
    case 'advanced':
      return [...is, ...isNot, ...counts, ...and, ...or];
    case 'expert':
      return [...is, ...isNot, ...counts, ...and, ...or, ...andNot];
  }
}

/** The rule forms that are new or allowed as the hidden rule at each band. */
export function hiddenRuleKinds(band: DifficultyBand): Rule['k'][] {
  switch (band) {
    case 'intro':
      return ['is'];
    case 'easy':
      return ['is', 'isNot'];
    case 'standard':
      return ['isNot', 'marksAtLeast', 'marksAtMost', 'and'];
    case 'advanced':
      return ['and', 'or'];
    case 'expert':
      return ['or', 'andNot'];
  }
}

/** Rules in `space` that agree with every observation. */
export function consistentRules(space: readonly Rule[], evidence: readonly Observation[]): Rule[] {
  return space.filter((r) => evidence.every((o) => consistent(r, o)));
}

/** True when every candidate rule agrees on every item, so the answers are forced. */
export function determines(candidates: readonly Rule[], items: readonly Specimen[]): boolean {
  return items.every((s) => {
    const first = candidates[0] ? passes(candidates[0], s) : null;
    return candidates.every((r) => passes(r, s) === first);
  });
}

const ARTICLE = (word: string) => (/^[aeiou]/.test(word) ? 'an' : 'a');

export function describeAtom(a: Atom): string {
  switch (a.p) {
    case 'shape':
      return `it is ${ARTICLE(a.v)} ${a.v}`;
    case 'colour':
      return `it is ${a.v}`;
    case 'size':
      return `it is ${a.v}`;
    case 'marks':
      return `it has ${a.v} mark${a.v === 1 ? '' : 's'}`;
  }
}

/** Plain-language statement of a rule, shown once the level is solved. */
export function describeRule(rule: Rule): string {
  switch (rule.k) {
    case 'is':
      return `A specimen passes when ${describeAtom(rule.a)}.`;
    case 'isNot':
      return `A specimen passes unless ${describeAtom(rule.a)}.`;
    case 'marksAtLeast':
      return `A specimen passes when it has ${rule.n} or more marks.`;
    case 'marksAtMost':
      return `A specimen passes when it has ${rule.n} mark${rule.n === 1 ? '' : 's'} or fewer.`;
    case 'and':
      return `A specimen passes when ${describeAtom(rule.a)} and ${describeAtom(rule.b)}.`;
    case 'or':
      return `A specimen passes when ${describeAtom(rule.a)} or ${describeAtom(rule.b)}.`;
    case 'andNot':
      return `A specimen passes when ${describeAtom(rule.a)}, unless ${describeAtom(rule.b)}.`;
  }
}

export const PROP_LABEL: Record<Prop, string> = { shape: 'shape', colour: 'colour', size: 'size', marks: 'marks' };

export function describeSpecimen(s: Specimen): string {
  return `${s.size} ${s.colour} ${s.shape} with ${s.marks} mark${s.marks === 1 ? '' : 's'}`;
}

const SHAPE_CODE: Record<string, Specimen['shape']> = { c: 'circle', t: 'triangle', s: 'square', h: 'hexagon' };
const COLOUR_CODE: Record<string, Specimen['colour']> = { r: 'red', b: 'blue', g: 'green', y: 'yellow' };

/** Compact specimen code: size (S/L), colour (r/b/g/y), shape (c/t/s/h), marks (1–3), e.g. `Lbt2`. */
export function parseSpecimen(code: string): Specimen {
  const size = code[0] === 'L' ? 'large' : code[0] === 'S' ? 'small' : null;
  const colour = COLOUR_CODE[code[1] ?? ''];
  const shape = SHAPE_CODE[code[2] ?? ''];
  const marks = Number(code[3]);
  if (!size || !colour || !shape || !(marks === 1 || marks === 2 || marks === 3) || code.length !== 4) {
    throw new Error(`Bad specimen code "${code}"`);
  }
  return { size, colour, shape, marks };
}

export function specimenCode(s: Specimen): string {
  return `${s.size === 'large' ? 'L' : 'S'}${s.colour[0]}${s.shape[0]}${s.marks}`;
}

export const sameSpecimen = (a: Specimen, b: Specimen) => specimenCode(a) === specimenCode(b);

import type { DifficultyBand, GameHint, GameModule, HintTier, PuzzleLevel, ValidationResult } from '@/game-runtime/contracts';
import { createRng, fingerprint, levelSeedKey, type Rng } from '@/game-runtime/rng';

import { HUES, SHAPES, type Hue, type Shape } from '../../memory-vault/whats-changed/logic';

/**
 * Picture Riddle (W1-G04): visual relationship mapping.
 *
 * Example cards show a picture turning into another under one hidden rule
 * (shape, colour, count and size can each change in a fixed way). Pick the
 * picture the same rule makes from a new card, then the reveal plays the rule
 * on it and names every change. Every rule consistent with the examples gives
 * the same answer, so the riddle is fair.
 */

export interface Picture {
  shape: number;
  hue: number;
  count: number;
  big: boolean;
}

export interface Rule {
  shape: 0 | 1 | -1;
  hue: 0 | 1 | -1;
  count: 'same' | 'plus' | 'minus' | 'double';
  size: 'same' | 'swap';
}

export interface RiddleState {
  band: DifficultyBand;
  shapes: number;
  hues: number;
  rule: Rule;
  examples: [Picture, Picture][];
  query: Picture;
  options: Picture[];
  answer: number;
  picked: number | null;
  wrongPicks: number[];
  solved: boolean;
}

export type RiddleAction = { type: 'pick'; option: number };

export const PICTURE_RIDDLE_ID = 'W1-G04';
export const PICTURE_RIDDLE_VERSION = '1.0.0';

const mod = (x: number, n: number) => ((x % n) + n) % n;

export function applyRule(r: Rule, p: Picture, shapes: number, hues: number): Picture | null {
  const count = r.count === 'same' ? p.count : r.count === 'plus' ? p.count + 1 : r.count === 'minus' ? p.count - 1 : p.count * 2;
  if (count < 1 || count > 4) return null;
  return { shape: mod(p.shape + r.shape, shapes), hue: mod(p.hue + r.hue, hues), count, big: r.size === 'swap' ? !p.big : p.big };
}

const same = (a: Picture | null, b: Picture | null) => !!a && !!b && a.shape === b.shape && a.hue === b.hue && a.count === b.count && a.big === b.big;
export const pictureKey = (p: Picture) => `${p.shape}${p.hue}${p.count}${p.big ? 'B' : 's'}`;

export const ALL_RULES: Rule[] = (() => {
  const out: Rule[] = [];
  for (const shape of [0, 1, -1] as const) for (const hue of [0, 1, -1] as const) for (const count of ['same', 'plus', 'minus', 'double'] as const) for (const size of ['same', 'swap'] as const) out.push({ shape, hue, count, size });
  return out;
})();

export const changes = (r: Rule) => (r.shape ? 1 : 0) + (r.hue ? 1 : 0) + (r.count !== 'same' ? 1 : 0) + (r.size !== 'same' ? 1 : 0);

export function consistentRules(s: Pick<RiddleState, 'examples' | 'shapes' | 'hues'>): Rule[] {
  return ALL_RULES.filter((r) => s.examples.every(([a, b]) => same(applyRule(r, a, s.shapes, s.hues), b)));
}

export function ruleText(r: Rule): string[] {
  const parts: string[] = [];
  if (r.shape) parts.push(r.shape === 1 ? 'the shape moves one step along the shape row' : 'the shape moves one step back along the shape row');
  if (r.hue) parts.push(r.hue === 1 ? 'the colour moves one step along the colour row' : 'the colour moves one step back along the colour row');
  if (r.count !== 'same') parts.push(r.count === 'plus' ? 'one more copy' : r.count === 'minus' ? 'one fewer copy' : 'the number of copies doubles');
  if (r.size === 'swap') parts.push('big and small swap');
  return parts.length ? parts : ['nothing changes'];
}

interface Profile {
  shapes: number;
  hues: number;
  changes: [number, number];
  examples: number;
  options: number;
}

export const RIDDLE_PROFILES: Readonly<Record<DifficultyBand, Profile>> = {
  intro: { shapes: 3, hues: 3, changes: [1, 1], examples: 1, options: 3 },
  easy: { shapes: 4, hues: 3, changes: [1, 2], examples: 2, options: 4 },
  standard: { shapes: 4, hues: 4, changes: [2, 2], examples: 2, options: 4 },
  advanced: { shapes: 5, hues: 4, changes: [2, 3], examples: 2, options: 5 },
  expert: { shapes: 6, hues: 5, changes: [3, 4], examples: 3, options: 6 },
};

const randomPicture = (rng: Rng, p: Profile): Picture => ({ shape: rng.int(0, p.shapes - 1), hue: rng.int(0, p.hues - 1), count: rng.int(1, 3), big: rng.chance(0.5) });

function tryBuild(rng: Rng, band: DifficultyBand, p: Profile): RiddleState | null {
  const candidates = ALL_RULES.filter((r) => changes(r) >= p.changes[0] && changes(r) <= p.changes[1]);
  const rule = rng.pick(candidates);
  const examples: [Picture, Picture][] = [];
  for (let i = 0; i < 30 && examples.length < p.examples; i += 1) {
    const a = randomPicture(rng, p);
    const b = applyRule(rule, a, p.shapes, p.hues);
    if (b && !examples.some(([x]) => same(x, a))) examples.push([a, b]);
  }
  if (examples.length < p.examples) return null;
  const query = randomPicture(rng, p);
  const answerPic = applyRule(rule, query, p.shapes, p.hues);
  if (!answerPic || examples.some(([a]) => same(a, query))) return null;
  // Fairness: every rule the examples allow must give the same answer.
  const allowed = consistentRules({ examples, shapes: p.shapes, hues: p.hues });
  if (!allowed.every((r) => same(applyRule(r, query, p.shapes, p.hues), answerPic))) return null;
  // Distractors: the answer with one attribute wrong (tempting near-misses), then random.
  const near: Picture[] = [
    { ...answerPic, shape: mod(answerPic.shape + 1, p.shapes) },
    { ...answerPic, hue: mod(answerPic.hue + 1, p.hues) },
    { ...answerPic, count: answerPic.count === 4 ? 3 : answerPic.count + 1 },
    { ...answerPic, big: !answerPic.big },
    query,
  ];
  const options: Picture[] = [answerPic];
  for (const d of rng.shuffle(near)) if (options.length < p.options && !options.some((o) => same(o, d))) options.push(d);
  while (options.length < p.options) {
    const d = randomPicture(rng, p);
    if (!options.some((o) => same(o, d))) options.push(d);
  }
  const shuffled = rng.shuffle(options);
  return { band, shapes: p.shapes, hues: p.hues, rule, examples, query, options: shuffled, answer: shuffled.findIndex((o) => same(o, answerPic)), picked: null, wrongPicks: [], solved: false };
}

export function generateRiddle(key: string, band: DifficultyBand, p: Profile = RIDDLE_PROFILES[band]): RiddleState {
  const rng = createRng(key);
  for (let i = 0; i < 5000; i += 1) {
    const s = tryBuild(rng, band, p);
    if (s) return s;
  }
  throw new Error('No acceptable riddle within the attempt budget');
}

export const RIDDLE_TUTORIALS = [
  { id: 'tutorial-1', difficulty: 'intro' as const, intro: 'The example card shows one change. Make the same change to the new picture.', profile: RIDDLE_PROFILES.intro },
  { id: 'tutorial-2', difficulty: 'easy' as const, intro: 'Two examples share one rule. Check every part: shape, colour, how many, and size.', profile: RIDDLE_PROFILES.easy },
  { id: 'tutorial-3', difficulty: 'advanced' as const, intro: 'Shapes and colours move along their rows (shown below), wrapping round at the end.', profile: RIDDLE_PROFILES.advanced },
];

export const riddleFingerprint = (s: RiddleState) => fingerprint(JSON.stringify([s.shapes, s.hues, s.examples, s.query, s.options]));
export const optionId = (i: number) => `option-${i}`;
export const shapeName = (i: number): Shape => SHAPES[i]!;
export const hueName = (i: number): Hue => HUES[i]!;

function toLevel(s: RiddleState, seed: string, difficulty: DifficultyBand, source: PuzzleLevel['source'], levelId: string): PuzzleLevel<RiddleState> {
  return { gameId: PICTURE_RIDDLE_ID, levelId, generatorVersion: PICTURE_RIDDLE_VERSION, seed, difficulty, source, fingerprint: riddleFingerprint(s), initialState: s, metadata: { changes: changes(s.rule), options: s.options.length } };
}

export const pictureRiddle: GameModule<RiddleState, RiddleAction> = {
  id: PICTURE_RIDDLE_ID,
  version: PICTURE_RIDDLE_VERSION,
  createLevel(seed, difficulty) {
    const t = RIDDLE_TUTORIALS.find((x) => x.id === seed);
    if (t) return toLevel(generateRiddle(levelSeedKey(PICTURE_RIDDLE_ID, PICTURE_RIDDLE_VERSION, seed), t.difficulty, t.profile), seed, t.difficulty, 'authored', `${PICTURE_RIDDLE_ID}:${seed}`);
    return toLevel(generateRiddle(levelSeedKey(PICTURE_RIDDLE_ID, PICTURE_RIDDLE_VERSION, `${seed}/${difficulty}`), difficulty), seed, difficulty, 'generated', `${PICTURE_RIDDLE_ID}:${difficulty}:${seed}`);
  },
  fallbackLevel(difficulty) {
    return toLevel(generateRiddle(levelSeedKey(PICTURE_RIDDLE_ID, PICTURE_RIDDLE_VERSION, `curated/${difficulty}`), difficulty), 'curated', difficulty, 'fallback', `${PICTURE_RIDDLE_ID}:fallback-${difficulty}`);
  },
  validateLevel(level): ValidationResult {
    if (level.gameId !== PICTURE_RIDDLE_ID) return { valid: false, reasonCode: 'wrong_game' };
    const s = level.initialState;
    if (s.shapes > SHAPES.length || s.hues > HUES.length || !s.examples.length || s.options.length < 2) return { valid: false, reasonCode: 'bad_riddle' };
    if (s.picked !== null || s.wrongPicks.length || s.solved) return { valid: false, reasonCode: 'bad_start' };
    const allowed = consistentRules(s);
    const answers = new Set(allowed.map((r) => applyRule(r, s.query, s.shapes, s.hues)).filter((x): x is Picture => !!x).map(pictureKey));
    if (answers.size !== 1 || pictureKey(s.options[s.answer]!) !== [...answers][0]) return { valid: false, reasonCode: 'ambiguous' };
    if (new Set(s.options.map(pictureKey)).size !== s.options.length) return { valid: false, reasonCode: 'duplicate_options' };
    if (level.fingerprint !== riddleFingerprint(s)) return { valid: false, reasonCode: 'fingerprint_mismatch' };
    return { valid: true, solutionFingerprint: fingerprint(pictureKey(s.options[s.answer]!)) };
  },
  reduce(s, a) {
    if (s.solved || a.type !== 'pick' || !s.options[a.option] || s.wrongPicks.includes(a.option)) return s;
    if (a.option === s.answer) return { ...s, picked: a.option, solved: true };
    return { ...s, picked: a.option, wrongPicks: [...s.wrongPicks, a.option] };
  },
  isComplete: (s) => s.solved,
  score: (s, { hintsUsed }) => 100 + Math.max(0, 50 - s.wrongPicks.length * 20 - hintsUsed * 10),
  hint(s, tier: HintTier): GameHint {
    const parts = ruleText(s.rule);
    if (tier === 1) return { tier, text: `${parts.length} thing${parts.length === 1 ? '' : 's'} change${parts.length === 1 ? 's' : ''} between the pictures.`, highlightIds: [] };
    if (tier === 2) return { tier, text: `One part of the rule: ${parts[0]}.`, highlightIds: [] };
    return { tier, text: 'The highlighted picture follows the rule.', highlightIds: [optionId(s.answer)] };
  },
};

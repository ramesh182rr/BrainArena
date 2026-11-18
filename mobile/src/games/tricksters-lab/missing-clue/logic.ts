import type { DifficultyBand, GameHint, GameModule, HintTier, PuzzleLevel, ValidationResult } from '@/game-runtime/contracts';
import { createRng, fingerprint, levelSeedKey, type Rng } from '@/game-runtime/rng';

/**
 * The Missing Clue (W1-G01): evidence reconstruction.
 *
 * Arrange event tokens into the order they happened, using clue cards. Clues
 * are checked live. From the advanced band a witness arrives mid-story; their
 * "first thing I saw" means first after they arrived, not first overall.
 * Every case has exactly one order that satisfies all clues.
 */

export interface CaseEvent {
  id: string;
  short: string;
  /** Past-tense clause, e.g. "the cat woke". */
  phrase: string;
}

export const EVENT_POOL: readonly CaseEvent[] = [
  { id: 'kettle', short: 'Kettle', phrase: 'the kettle whistled' },
  { id: 'vase', short: 'Vase', phrase: 'a vase tipped over' },
  { id: 'cat', short: 'Cat', phrase: 'the cat woke' },
  { id: 'lights', short: 'Lights', phrase: 'the lights flickered' },
  { id: 'door', short: 'Door', phrase: 'the back door creaked' },
  { id: 'letter', short: 'Letter', phrase: 'a letter slid under the door' },
  { id: 'clock', short: 'Clock', phrase: 'the clock stopped' },
  { id: 'rain', short: 'Rain', phrase: 'the rain started' },
  { id: 'dog', short: 'Dog', phrase: 'the dog barked' },
  { id: 'window', short: 'Window', phrase: 'a window blew open' },
  { id: 'steps', short: 'Steps', phrase: 'footsteps crossed the attic' },
  { id: 'phone', short: 'Phone', phrase: 'the phone rang' },
];

export const WITNESS: CaseEvent = { id: 'witness', short: 'Witness', phrase: 'the witness arrived' };

export type Clue =
  | { k: 'before'; a: number; b: number }
  | { k: 'rightAfter'; a: number; b: number }
  | { k: 'apart'; a: number; b: number }
  | { k: 'first'; a: number }
  | { k: 'last'; a: number }
  | { k: 'notFirst'; a: number }
  | { k: 'notLast'; a: number }
  | { k: 'gap'; a: number; b: number; n: number }
  | { k: 'witnessSaw'; a: number };

export interface ClueState {
  band: DifficultyBand;
  events: readonly CaseEvent[];
  clues: readonly Clue[];
  /** The one true order (event indices), for hints and validation. */
  truth: readonly number[];
  /** Event index in each timeline slot, or null. */
  slots: readonly (number | null)[];
  history: readonly (readonly (number | null)[])[];
  moves: number;
}

export type ClueAction = { type: 'place'; event: number } | { type: 'lift'; slot: number } | { type: 'undo' } | { type: 'reset' };

export const MISSING_CLUE_ID = 'W1-G01';
export const MISSING_CLUE_VERSION = '1.0.0';

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function clueText(c: Clue, ev: readonly CaseEvent[]): string {
  const p = (i: number) => ev[i]!.phrase;
  switch (c.k) {
    case 'before':
      return `${cap(p(c.a))} before ${p(c.b)}.`;
    case 'rightAfter':
      return `Right after ${p(c.a)}, ${p(c.b)}.`;
    case 'apart':
      return `Something else happened between when ${p(c.a)} and when ${p(c.b)}.`;
    case 'first':
      return `${cap(p(c.a))} first of all.`;
    case 'last':
      return `${cap(p(c.a))} last of all.`;
    case 'notFirst':
      return `${cap(p(c.a))}, but not first.`;
    case 'notLast':
      return `${cap(p(c.a))}, but not last.`;
    case 'gap':
      return `${cap(p(c.b))} exactly ${c.n} events after ${p(c.a)}.`;
    case 'witnessSaw':
      return `The witness says: "The first thing I saw was when ${p(c.a)}."`;
  }
}

/** Does the clue hold for a full order (positions of each event)? */
function holds(c: Clue, pos: readonly number[], n: number, witness: number): boolean {
  switch (c.k) {
    case 'before':
      return pos[c.a]! < pos[c.b]!;
    case 'rightAfter':
      return pos[c.b]! === pos[c.a]! + 1;
    case 'apart':
      return Math.abs(pos[c.a]! - pos[c.b]!) > 1;
    case 'first':
      return pos[c.a] === 0;
    case 'last':
      return pos[c.a] === n - 1;
    case 'notFirst':
      return pos[c.a] !== 0;
    case 'notLast':
      return pos[c.a] !== n - 1;
    case 'gap':
      return pos[c.b]! - pos[c.a]! === c.n;
    case 'witnessSaw':
      return witness >= 0 && pos[c.a]! === pos[witness]! + 1;
  }
}

const eventsIn = (c: Clue): number[] => ('b' in c ? [c.a, c.b] : [c.a]);

/** Live status for the board: true/false once its events are placed (and the timeline is full for position clues). */
export function clueStatus(s: ClueState, c: Clue): boolean | null {
  const n = s.slots.length;
  const pos: number[] = new Array(s.events.length).fill(-1);
  s.slots.forEach((e, i) => {
    if (e !== null) pos[e] = i;
  });
  const witness = s.events.findIndex((e) => e.id === WITNESS.id);
  // "First"/"last" can already fail when another event occupies that end of the timeline.
  if (c.k === 'first' && pos[c.a]! < 0) return s.slots[0] === null ? null : false;
  if (c.k === 'last' && pos[c.a]! < 0) return s.slots[n - 1] === null ? null : false;
  const needed = [...eventsIn(c), ...(c.k === 'witnessSaw' ? [witness] : [])];
  if (needed.some((e) => pos[e]! < 0)) return null;
  return holds(c, pos, n, witness);
}

function permutations(n: number): number[][] {
  if (n === 1) return [[0]];
  return permutations(n - 1).flatMap((p) => Array.from({ length: n }, (_, i) => [...p.slice(0, i), n - 1, ...p.slice(i)]));
}

const PERMS = new Map<number, number[][]>();
function perms(n: number) {
  if (!PERMS.has(n)) PERMS.set(n, permutations(n));
  return PERMS.get(n)!;
}

/** Orders (as event lists) consistent with all clues. */
export function consistentOrders(n: number, clues: readonly Clue[], witness: number): number[][] {
  return perms(n).filter((order) => {
    const pos: number[] = [];
    order.forEach((e, i) => (pos[e] = i));
    return clues.every((c) => holds(c, pos, n, witness));
  });
}

interface Profile {
  events: number;
  witness: boolean;
  kinds: readonly Clue['k'][];
}

export const CLUE_PROFILES: Readonly<Record<DifficultyBand, Profile>> = {
  intro: { events: 4, witness: false, kinds: ['before', 'first', 'last'] },
  easy: { events: 5, witness: false, kinds: ['before', 'rightAfter', 'first', 'last'] },
  standard: { events: 5, witness: false, kinds: ['before', 'rightAfter', 'apart', 'notFirst', 'notLast'] },
  advanced: { events: 6, witness: true, kinds: ['before', 'rightAfter', 'apart', 'notFirst', 'notLast'] },
  expert: { events: 7, witness: true, kinds: ['before', 'apart', 'notFirst', 'notLast', 'gap'] },
};

function trueClues(truth: readonly number[], kinds: readonly Clue['k'][]): Clue[] {
  const n = truth.length;
  const pos: number[] = [];
  truth.forEach((e, i) => (pos[e] = i));
  const out: Clue[] = [];
  for (let a = 0; a < n; a += 1) {
    if (kinds.includes('first') && pos[a] === 0) out.push({ k: 'first', a });
    if (kinds.includes('last') && pos[a] === n - 1) out.push({ k: 'last', a });
    if (kinds.includes('notFirst') && pos[a] !== 0) out.push({ k: 'notFirst', a });
    if (kinds.includes('notLast') && pos[a] !== n - 1) out.push({ k: 'notLast', a });
    for (let b = 0; b < n; b += 1) {
      if (a === b) continue;
      if (kinds.includes('before') && pos[a]! < pos[b]!) out.push({ k: 'before', a, b });
      if (kinds.includes('rightAfter') && pos[b] === pos[a]! + 1) out.push({ k: 'rightAfter', a, b });
      if (kinds.includes('apart') && a < b && Math.abs(pos[a]! - pos[b]!) > 1) out.push({ k: 'apart', a, b });
      if (kinds.includes('gap') && pos[b]! - pos[a]! >= 2) out.push({ k: 'gap', a, b, n: pos[b]! - pos[a]! });
    }
  }
  return out;
}

export function assembleCase(band: DifficultyBand, events: readonly CaseEvent[], clues: readonly Clue[], truth: readonly number[]): ClueState {
  return { band, events, clues, truth, slots: truth.map(() => null), history: [], moves: 0 };
}

function tryBuild(rng: Rng, band: DifficultyBand, p: Profile): ClueState | null {
  const picked = rng.shuffle(EVENT_POOL).slice(0, p.witness ? p.events - 1 : p.events);
  const events = p.witness ? [...picked, WITNESS] : picked;
  const n = events.length;
  const witness = p.witness ? n - 1 : -1;
  const truth = rng.shuffle(Array.from({ length: n }, (_, i) => i));
  const pos: number[] = [];
  truth.forEach((e, i) => (pos[e] = i));
  const clues: Clue[] = [];
  if (p.witness) {
    // The witness must not arrive first, so "the first thing I saw" is a genuine trap.
    if (pos[witness] === 0 || pos[witness] === n - 1) return null;
    clues.push({ k: 'witnessSaw', a: truth[pos[witness]! + 1]! });
  }
  const pool = rng.shuffle(trueClues(truth, p.kinds).filter((c) => !eventsIn(c).includes(witness) || c.k === 'before'));
  let remaining = consistentOrders(n, clues, witness).length;
  for (const c of pool) {
    if (remaining === 1) break;
    const left = consistentOrders(n, [...clues, c], witness).length;
    if (left < remaining) {
      clues.push(c);
      remaining = left;
    }
  }
  if (remaining !== 1) return null;
  // Drop clues that are no longer needed (the witness clue always stays).
  for (const c of rng.shuffle([...clues])) {
    if (c.k === 'witnessSaw') continue;
    const without = clues.filter((x) => x !== c);
    if (consistentOrders(n, without, witness).length === 1) clues.splice(clues.indexOf(c), 1);
  }
  return assembleCase(band, events, rng.shuffle(clues), truth);
}

export function generateCase(key: string, band: DifficultyBand): ClueState {
  const rng = createRng(key);
  for (let i = 0; i < 200; i += 1) {
    const s = tryBuild(rng, band, CLUE_PROFILES[band]);
    if (s) return s;
  }
  throw new Error('No acceptable case within the attempt budget');
}

const ev = (id: string) => EVENT_POOL.find((e) => e.id === id)!;

export const CLUE_TUTORIALS = [
  {
    id: 'tutorial-1',
    difficulty: 'intro' as const,
    intro: 'Tap the events into the timeline in the order they happened. Each clue lights up green when your timeline agrees with it.',
    make: () =>
      assembleCase('intro', [ev('rain'), ev('dog'), ev('door'), ev('cat')], [
        { k: 'first', a: 0 },
        { k: 'before', a: 1, b: 2 },
        { k: 'last', a: 3 },
      ], [0, 1, 2, 3]),
  },
  {
    id: 'tutorial-2',
    difficulty: 'easy' as const,
    intro: '"Right after" means next in line, with nothing in between.',
    make: () =>
      assembleCase('easy', [ev('kettle'), ev('phone'), ev('vase'), ev('lights'), ev('clock')], [
        { k: 'rightAfter', a: 1, b: 2 },
        { k: 'first', a: 3 },
        { k: 'last', a: 4 },
        { k: 'before', a: 2, b: 0 },
      ], [3, 1, 2, 0, 4]),
  },
  {
    id: 'tutorial-3',
    difficulty: 'advanced' as const,
    intro: 'Careful with witnesses: "the first thing I saw" only counts from when they arrived.',
    make: () =>
      assembleCase('advanced', [ev('letter'), ev('window'), ev('steps'), ev('dog'), WITNESS], [
        { k: 'witnessSaw', a: 2 },
        { k: 'first', a: 0 },
        { k: 'before', a: 0, b: 4 },
        { k: 'last', a: 3 },
        { k: 'rightAfter', a: 0, b: 1 },
      ], [0, 1, 4, 2, 3]),
  },
];

export const caseFingerprint = (s: ClueState) => fingerprint(JSON.stringify([s.events.map((e) => e.id), s.clues, s.truth]));
export const tokenId = (event: number) => `token-${event}`;
export const clueId = (i: number) => `clue-${i}`;

function toLevel(s: ClueState, seed: string, difficulty: DifficultyBand, source: PuzzleLevel['source'], levelId: string): PuzzleLevel<ClueState> {
  return { gameId: MISSING_CLUE_ID, levelId, generatorVersion: MISSING_CLUE_VERSION, seed, difficulty, source, fingerprint: caseFingerprint(s), initialState: s, metadata: { events: s.events.length, clues: s.clues.length } };
}

const witnessIndex = (s: ClueState) => s.events.findIndex((e) => e.id === WITNESS.id);

export const solvedCase = (s: ClueState) => s.slots.every((e, i) => e === s.truth[i]);

export const missingClue: GameModule<ClueState, ClueAction> = {
  id: MISSING_CLUE_ID,
  version: MISSING_CLUE_VERSION,
  createLevel(seed, difficulty) {
    const t = CLUE_TUTORIALS.find((x) => x.id === seed);
    if (t) return toLevel(t.make(), seed, t.difficulty, 'authored', `${MISSING_CLUE_ID}:${seed}`);
    return toLevel(generateCase(levelSeedKey(MISSING_CLUE_ID, MISSING_CLUE_VERSION, `${seed}/${difficulty}`), difficulty), seed, difficulty, 'generated', `${MISSING_CLUE_ID}:${difficulty}:${seed}`);
  },
  fallbackLevel(difficulty) {
    return toLevel(generateCase(levelSeedKey(MISSING_CLUE_ID, MISSING_CLUE_VERSION, `curated/${difficulty}`), difficulty), 'curated', difficulty, 'fallback', `${MISSING_CLUE_ID}:fallback-${difficulty}`);
  },
  validateLevel(level): ValidationResult {
    if (level.gameId !== MISSING_CLUE_ID) return { valid: false, reasonCode: 'wrong_game' };
    const s = level.initialState;
    const n = s.events.length;
    if (n < 3 || n > 7 || s.truth.length !== n || new Set(s.truth).size !== n) return { valid: false, reasonCode: 'bad_events' };
    if (s.slots.length !== n || s.slots.some((x) => x !== null) || s.moves) return { valid: false, reasonCode: 'bad_start' };
    const orders = consistentOrders(n, s.clues, witnessIndex(s));
    if (orders.length !== 1) return { valid: false, reasonCode: orders.length === 0 ? 'contradictory' : 'ambiguous' };
    if (orders[0]!.join() !== s.truth.join()) return { valid: false, reasonCode: 'truth_mismatch' };
    if (level.fingerprint !== caseFingerprint(s)) return { valid: false, reasonCode: 'fingerprint_mismatch' };
    return { valid: true, solutionFingerprint: fingerprint(s.truth.join()) };
  },
  reduce(s, a) {
    if (solvedCase(s)) return s;
    const record = (slots: (number | null)[]) => ({ ...s, slots, history: [...s.history, s.slots].slice(-50), moves: s.moves + 1 });
    switch (a.type) {
      case 'place': {
        const empty = s.slots.indexOf(null);
        if (!Number.isInteger(a.event) || a.event < 0 || a.event >= s.events.length || s.slots.includes(a.event) || empty < 0) return s;
        const slots = [...s.slots];
        slots[empty] = a.event;
        return record(slots);
      }
      case 'lift': {
        if (!Number.isInteger(a.slot) || s.slots[a.slot] === null || s.slots[a.slot] === undefined) return s;
        const slots = [...s.slots];
        slots[a.slot] = null;
        return record(slots);
      }
      case 'undo': {
        const prev = s.history[s.history.length - 1];
        return prev ? { ...s, slots: prev, history: s.history.slice(0, -1) } : s;
      }
      case 'reset':
        return s.slots.some((x) => x !== null) ? { ...s, slots: s.slots.map(() => null), history: [...s.history, s.slots] } : s;
      default:
        return s;
    }
  },
  isComplete: solvedCase,
  score(s, { hintsUsed }) {
    const extra = Math.max(0, s.moves - 2 * s.events.length);
    return 100 + Math.max(0, 50 - extra * 2 - hintsUsed * 10);
  },
  hint(s, tier: HintTier): GameHint {
    const broken = s.clues.findIndex((c) => clueStatus(s, c) === false);
    if (tier === 1) {
      return broken >= 0
        ? { tier, text: 'The highlighted clue disagrees with your timeline.', highlightIds: [clueId(broken)] }
        : { tier, text: 'Every clue you can check so far agrees. Keep placing events.', highlightIds: [] };
    }
    const wrongSlots = s.truth.map((e, i) => (s.slots[i] === e ? -1 : i)).filter((i) => i >= 0);
    const show = wrongSlots.slice(0, tier === 2 ? 1 : 2);
    if (show.length === 0) return { tier, text: 'Your timeline is complete.', highlightIds: [] };
    return {
      tier,
      text: show.map((i) => `Slot ${i + 1} holds: ${s.events[s.truth[i]!]!.short}.`).join(' '),
      highlightIds: show.map((i) => tokenId(s.truth[i]!)),
    };
  },
};

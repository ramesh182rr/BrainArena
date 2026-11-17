import type { DifficultyBand } from '@/game-runtime/contracts';

import type { MachineSwitch } from './types';

/**
 * Hand-made machines. Header: `levels=3 start=000 target=111 slack=3`.
 * One line per switch: `+0` raises dial 0, `-2` lowers dial 2, `?1=2` fires only while dial 1 shows 2.
 */
export interface AuthoredMachine {
  id: string;
  difficulty: DifficultyBand;
  intro: string;
  header: string;
  switches: readonly string[];
}

export interface ParsedMachine {
  levels: number;
  start: number[];
  target: number[];
  slack: number;
  switches: MachineSwitch[];
}

export function parseMachine(header: string, lines: readonly string[]): ParsedMachine {
  const f = Object.fromEntries(header.trim().split(/\s+/).map((kv) => kv.split('=') as [string, string]));
  const levels = Number(f.levels);
  const digits = (s: string | undefined) => (s ?? '').split('').map(Number);
  const start = digits(f.start);
  const target = digits(f.target);
  if (![3, 4].includes(levels) || start.length < 2 || start.length !== target.length) throw new Error('Bad machine header');
  if ([...start, ...target].some((v) => !Number.isInteger(v) || v < 0 || v >= levels)) throw new Error('Dial level out of range');
  const switches = lines.map((line): MachineSwitch => {
    const effects: MachineSwitch['effects'][number][] = [];
    let condition: MachineSwitch['condition'] = null;
    for (const tok of line.trim().split(/\s+/)) {
      if (tok.startsWith('?')) {
        const [d, l] = tok.slice(1).split('=').map(Number);
        condition = { dial: d!, level: l! };
      } else if (tok[0] === '+' || tok[0] === '-') {
        effects.push({ dial: Number(tok.slice(1)), delta: tok[0] === '+' ? 1 : -1 });
      } else {
        throw new Error(`Bad switch token "${tok}"`);
      }
    }
    if (effects.some((e) => !Number.isInteger(e.dial) || e.dial >= start.length)) throw new Error('Switch wired to a missing dial');
    return { effects, condition };
  });
  return { levels, start, target, slack: Number(f.slack ?? 3), switches };
}

export const MACHINE_TUTORIALS: readonly AuthoredMachine[] = [
  {
    id: 'tutorial-1',
    difficulty: 'intro',
    intro: 'Each switch is secretly wired to some dials. Press one to reveal its wires, then plan the rest to match the target marks.',
    header: 'levels=3 start=000 target=111 slack=3',
    switches: ['+0 +1', '+2', '+1 +2'],
  },
  {
    id: 'tutorial-2',
    difficulty: 'easy',
    intro: 'Some wires turn a dial DOWN. Dials wrap round: down from 0 goes to the top level.',
    header: 'levels=3 start=1111 target=0022 slack=3',
    switches: ['-0 -1', '+2 +1', '-1 +3'],
  },
  {
    id: 'tutorial-3',
    difficulty: 'advanced',
    intro: 'A locked switch only fires while a certain dial shows a certain level. Order matters now.',
    header: 'levels=3 start=000 target=120 slack=3',
    switches: ['+0', '+1 ?0=1', '+1 +2'],
  },
  {
    id: 'tutorial-4',
    difficulty: 'expert',
    intro: 'Four levels per dial. Out of presses? Reset restores the machine, and your wiring notes stay.',
    header: 'levels=4 start=0000 target=3120 slack=3',
    switches: ['+0 -3', '+1 +3', '-0 +2', '+3 ?1=1'],
  },
];

/** Curated fallbacks per band, frozen from reviewed generator output. */
export const MACHINE_FALLBACKS: Readonly<Record<DifficultyBand, AuthoredMachine>> = {
  intro: { id: 'fallback-intro', difficulty: 'intro', intro: '', header: 'levels=3 start=100 target=020 slack=3', switches: ['+0 +1', '+1', '+0 +2'] },
  easy: { id: 'fallback-easy', difficulty: 'easy', intro: '', header: 'levels=3 start=2100 target=1221 slack=3', switches: ['+0', '+1 -3', '+1 -2 +3'] },
  standard: {
    id: 'fallback-standard',
    difficulty: 'standard',
    intro: '',
    header: 'levels=3 start=1111 target=1222 slack=3',
    switches: ['-3', '-2 +3', '+0', '+1'],
  },
  advanced: {
    id: 'fallback-advanced',
    difficulty: 'advanced',
    intro: '',
    header: 'levels=3 start=22110 target=01020 slack=3',
    switches: ['+0 +1 -4', '+0 +2 -4', '-3', '+3 +4 ?1=0'],
  },
  expert: {
    id: 'fallback-expert',
    difficulty: 'expert',
    intro: '',
    header: 'levels=4 start=10311 target=33033 slack=3',
    switches: ['+0 +2 +4', '+1 -2', '+3', '-2 +4 ?0=0', '+1 ?4=3'],
  },
};

export function findAuthoredMachine(id: string): AuthoredMachine | undefined {
  return MACHINE_TUTORIALS.find((m) => m.id === id) ?? Object.values(MACHINE_FALLBACKS).find((m) => m.id === id);
}

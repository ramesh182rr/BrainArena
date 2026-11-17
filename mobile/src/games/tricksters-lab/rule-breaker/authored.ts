import type { DifficultyBand } from '@/game-runtime/contracts';

import { parseSpecimen } from './rules';
import type { Atom, Rule, Specimen } from './types';

/**
 * Hand-made labs. Specimens use compact codes: size (S/L), colour (r/b/g/y),
 * shape (c/t/s/h), marks (1–3), e.g. `Lbt2` = large blue triangle with 2 marks.
 * Rules use `prop=value`, `prop!=value`, `marks>=n`, `marks<=n`, `A&B`, `A|B`, `A&!B`.
 */
export interface AuthoredLab {
  id: string;
  difficulty: DifficultyBand;
  intro: string;
  rule: string;
  tray: readonly string[];
}

function parseAtom(text: string): Atom {
  const [p, v] = text.split('=');
  if (p === 'marks') return { p, v: Number(v) as 1 | 2 | 3 };
  if (p === 'shape' || p === 'colour' || p === 'size') return { p, v } as Atom;
  throw new Error(`Bad rule atom "${text}"`);
}

export function parseRule(text: string): Rule {
  if (text.includes('&!')) {
    const [a, b] = text.split('&!');
    return { k: 'andNot', a: parseAtom(a!), b: parseAtom(b!) };
  }
  if (text.includes('&')) {
    const [a, b] = text.split('&');
    return { k: 'and', a: parseAtom(a!), b: parseAtom(b!) };
  }
  if (text.includes('|')) {
    const [a, b] = text.split('|');
    return { k: 'or', a: parseAtom(a!), b: parseAtom(b!) };
  }
  if (text.startsWith('marks>=')) return { k: 'marksAtLeast', n: Number(text.slice(7)) as 2 | 3 };
  if (text.startsWith('marks<=')) return { k: 'marksAtMost', n: Number(text.slice(7)) as 1 | 2 };
  if (text.includes('!=')) return { k: 'isNot', a: parseAtom(text.replace('!=', '=')) };
  return { k: 'is', a: parseAtom(text) };
}

export function parseTray(codes: readonly string[]): Specimen[] {
  return codes.map(parseSpecimen);
}

export const LAB_TUTORIALS: readonly AuthoredLab[] = [
  {
    id: 'tutorial-1',
    difficulty: 'intro',
    intro: 'Tap a specimen to scan it. A FAIL also tells you which property caused it. When you know the rule, take the test.',
    rule: 'shape=triangle',
    tray: ['Lrt1', 'Sbc2', 'Lgs1', 'Syt3', 'Lbh2'],
  },
  {
    id: 'tutorial-2',
    difficulty: 'easy',
    intro: 'Some rules work the other way round: everything passes except one kind. Watch which ones fail.',
    rule: 'colour!=blue',
    tray: ['Lbc1', 'Src2', 'Lgs3', 'Sbt2', 'Lyh1', 'Sgc3'],
  },
  {
    id: 'tutorial-3',
    difficulty: 'standard',
    intro: 'Rules can count. Look closely at the little marks on each specimen.',
    rule: 'marks>=2',
    tray: ['Lrc1', 'Sbt2', 'Lgs3', 'Syh1', 'Lbc3', 'Srt2', 'Lys1'],
  },
  {
    id: 'tutorial-4',
    difficulty: 'advanced',
    intro: 'Now two properties must both be right. When a specimen fails, the scanner names only the part that went wrong.',
    rule: 'shape=circle&size=large',
    tray: ['Lrc1', 'Lbc3', 'Src2', 'Lrt2', 'Sgs1', 'Lyc2', 'Sbh3', 'Lgh1'],
  },
];

/** Curated fallbacks per band, served when generation fails. Frozen from reviewed generator output. */
export const LAB_FALLBACKS: Readonly<Record<DifficultyBand, AuthoredLab>> = {
  intro: { id: 'fallback-intro', difficulty: 'intro', intro: '', rule: 'marks=1', tray: ['Lrt1', 'Lgs1', 'Srt1', 'Sbt3', 'Syc2'] },
  easy: { id: 'fallback-easy', difficulty: 'easy', intro: '', rule: 'colour=blue', tray: ['Lyt1', 'Src2', 'Lbs3', 'Srt3', 'Sgt2', 'Sbh1'] },
  standard: {
    id: 'fallback-standard',
    difficulty: 'standard',
    intro: '',
    rule: 'marks<=2',
    tray: ['Lbc1', 'Srs1', 'Src1', 'Lgc3', 'Lbh3', 'Lrc2', 'Lgt3', 'Src2'],
  },
  advanced: {
    id: 'fallback-advanced',
    difficulty: 'advanced',
    intro: '',
    rule: 'colour=red&marks=2',
    tray: ['Sgs2', 'Lrc2', 'Src1', 'Src3', 'Lrc3', 'Lbt2', 'Lbc1', 'Srh2', 'Lyc1'],
  },
  expert: {
    id: 'fallback-expert',
    difficulty: 'expert',
    intro: '',
    rule: 'colour=blue&!shape=square',
    tray: ['Srt2', 'Lgt1', 'Sbc2', 'Src3', 'Lgt2', 'Lrc1', 'Lrs3', 'Lbh1', 'Src2', 'Sgs3'],
  },
};

export function findAuthoredLab(id: string): AuthoredLab | undefined {
  return LAB_TUTORIALS.find((l) => l.id === id) ?? Object.values(LAB_FALLBACKS).find((l) => l.id === id);
}

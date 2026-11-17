import type { DifficultyBand } from '@/game-runtime/contracts';

import type { Bloom, GardenCell, Inventory } from './types';

/**
 * Hand-made gardens. Header: `cycle=rose,leaf,sky inventory=rose:1,sky:2`.
 * Cells: R rose · S sun · L leaf · K sky; prefix `@` = watering pad; suffix `*` = hardy; `##` stone.
 */
export interface AuthoredGarden {
  id: string;
  difficulty: DifficultyBand;
  intro: string;
  header: string;
  rows: readonly string[];
}

export interface ParsedGarden {
  width: number;
  height: number;
  cycle: Bloom[];
  cells: GardenCell[];
  inventory: Inventory;
}

const LETTERS: Record<string, Bloom> = { R: 'rose', S: 'sun', L: 'leaf', K: 'sky' };

function parseCell(token: string): GardenCell {
  if (token === '##') return { t: 'stone' };
  const pad = token.startsWith('@');
  const body = pad ? token.slice(1) : token;
  const hardy = body.endsWith('*');
  const colour = LETTERS[hardy ? body.slice(0, -1) : body];
  if (!colour) throw new Error(`Unknown garden token "${token}"`);
  return { t: 'plant', colour, hardy, pad };
}

export function parseGarden(header: string, rows: readonly string[]): ParsedGarden {
  const fields = Object.fromEntries(header.trim().split(/\s+/).map((kv) => kv.split('=') as [string, string]));
  const cycle = (fields.cycle ?? '').split(',') as Bloom[];
  if (cycle.length < 3 || cycle.some((c) => !Object.values(LETTERS).includes(c))) throw new Error('Bad garden cycle');
  const inventory: Inventory = {};
  for (const part of (fields.inventory ?? '').split(',').filter(Boolean)) {
    const [colour, count] = part.split(':');
    if (!cycle.includes(colour as Bloom) || !Number.isInteger(Number(count))) throw new Error(`Bad inventory "${part}"`);
    inventory[colour as Bloom] = Number(count);
  }
  const grid = rows.map((r) => r.trim().split(/\s+/));
  const width = grid[0]?.length ?? 0;
  grid.forEach((row, i) => {
    if (row.length !== width) throw new Error(`Row ${i} has ${row.length} cells, expected ${width}`);
  });
  return { width, height: grid.length, cycle, cells: grid.flat().map(parseCell), inventory };
}

const THREE = 'cycle=rose,leaf,sky';

export const GARDEN_TUTORIALS: readonly AuthoredGarden[] = [
  {
    id: 'tutorial-1',
    difficulty: 'intro',
    intro: 'Rose eats Leaf. Drop the Rose droplet on the glowing pad and watch it spread through every Leaf it touches.',
    header: `${THREE} inventory=rose:1`,
    rows: ['L L  L', 'L @K L', 'L L  L'],
  },
  {
    id: 'tutorial-2',
    difficulty: 'easy',
    intro: 'Each colour eats the next: Rose eats Leaf, Leaf eats Sky, Sky eats Rose. Order matters — plan which droplet goes first.',
    header: `${THREE} inventory=sky:1,leaf:1`,
    rows: ['@K K L L', 'K  K L L', '@R R R R'],
  },
  {
    id: 'tutorial-3',
    difficulty: 'advanced',
    intro: 'Hardy plants wear a shell. A hit cracks the shell instead of changing the colour, and the cascade stops there.',
    header: `${THREE} inventory=rose:3`,
    rows: ['L L   L', 'L @K* L*', 'L L   L'],
  },
  {
    id: 'tutorial-4',
    difficulty: 'expert',
    intro: 'Four colours now: Rose eats Sun, Sun eats Leaf, Leaf eats Sky, Sky eats Rose. Each colour has fewer meals.',
    header: 'cycle=rose,sun,leaf,sky inventory=leaf:1,sun:1,rose:1',
    rows: ['@R R  S S', 'R  R  S S', 'K  K  L L', 'K  @K L @L'],
  },
];

/** Curated fallbacks per band, frozen from reviewed generator output. */
export const GARDEN_FALLBACKS: Readonly<Record<DifficultyBand, AuthoredGarden>> = {
  intro: {
    id: 'fallback-intro',
    difficulty: 'intro',
    intro: '',
    header: `${THREE} inventory=leaf:1,rose:1,sky:1`,
    rows: ['K K @K @K', 'L K K K', 'L K R @R', 'L K R R'],
  },
  easy: {
    id: 'fallback-easy',
    difficulty: 'easy',
    intro: '',
    header: `${THREE} inventory=rose:1,sky:1,leaf:1`,
    rows: ['L L @L K', 'L L L L', 'L @R L L', 'L R R R', 'L @R R R'],
  },
  standard: {
    id: 'fallback-standard',
    difficulty: 'standard',
    intro: '',
    header: `${THREE} inventory=rose:2,sky:1`,
    rows: ['K K @K K R', '@L K K ## R', 'L L R R L', '@L L R R L', 'R ## R R @L'],
  },
  advanced: {
    id: 'fallback-advanced',
    difficulty: 'advanced',
    intro: '',
    header: `${THREE} inventory=rose:2,sky:1,leaf:1`,
    rows: ['@R @R K K @R', 'L R L R* ##', 'L @L L L* R', 'K K L L L', 'K K ## L L'],
  },
  expert: {
    id: 'fallback-expert',
    difficulty: 'expert',
    intro: '',
    header: 'cycle=rose,sun,leaf,sky inventory=sun:1,rose:1,sky:1',
    rows: ['@R R R L @L', 'R @K L L L', 'R K K ## @L*', 'K K K* K K', 'K ## K K K', 'K K K K K'],
  },
};

export function findAuthoredGarden(id: string): AuthoredGarden | undefined {
  return GARDEN_TUTORIALS.find((g) => g.id === id) ?? Object.values(GARDEN_FALLBACKS).find((g) => g.id === id);
}

/**
 * Colour Cascade (W4-G02): colour ecology.
 *
 * Plants come in colours arranged in a feeding cycle: each colour eats the
 * next one. Dropping a droplet on a watering pad turns that plant to the
 * droplet's colour, then the change cascades through every connected plant of
 * the colour it eats. Hardy plants lose a shell instead of changing, and stop
 * the cascade there. Stones block. The garden is in full bloom (stable) when
 * every plant shares one colour.
 */

export const ALL_COLOURS = ['rose', 'sun', 'leaf', 'sky'] as const;
export type Bloom = (typeof ALL_COLOURS)[number];

export type GardenCell =
  | { t: 'plant'; colour: Bloom; hardy: boolean; pad: boolean }
  | { t: 'stone' };

export type Inventory = Partial<Record<Bloom, number>>;

export interface CascadeState {
  width: number;
  height: number;
  /** Feeding cycle for this garden: `cycle[i]` eats `cycle[(i + 1) % n]`. */
  cycle: readonly Bloom[];
  cells: readonly GardenCell[];
  inventory: Inventory;
  /** Drops made so far, oldest first. */
  drops: readonly { index: number; colour: Bloom }[];
  /** Plants changed (or unshelled) by the latest drop, in cascade order. */
  lastWave: readonly number[];
  /** Earlier states for undo. */
  history: readonly Snapshot[];
  /** Fewest drops that bring the garden into full bloom. */
  par: number;
}

export interface Snapshot {
  cells: readonly GardenCell[];
  inventory: Inventory;
  drops: readonly { index: number; colour: Bloom }[];
  lastWave: readonly number[];
}

export type CascadeAction = { type: 'drop'; index: number; colour: Bloom } | { type: 'undo' } | { type: 'reset' };

export const BLOOM_INFO: Record<Bloom, { label: string; glyph: string }> = {
  rose: { label: 'Rose', glyph: '✿' },
  sun: { label: 'Sun', glyph: '✹' },
  leaf: { label: 'Leaf', glyph: '❦' },
  sky: { label: 'Sky', glyph: '💧' },
};

/**
 * Volt Courier (W3-G01): energy-current routing.
 *
 * Emitters fire pulses of a kind (spark, wave, flux). Pulses travel through
 * conduit tiles; the player rotates junctions so each pulse reaches a receiver
 * of its own kind. Two pulses may not share a conduit (overload), except at a
 * crossing, where perpendicular currents pass through each other. Gates are
 * fixed conduits that only let their own pulse kind through.
 */

export const PULSE_KINDS = ['spark', 'wave', 'flux'] as const;
export type PulseKind = (typeof PULSE_KINDS)[number];

/** 0 = north, 1 = east, 2 = south, 3 = west. */
export type Dir = 0 | 1 | 2 | 3;

export type Cell =
  | { t: 'empty' }
  /** Conduit joining two opposite sides. Rotation 0 = north–south. */
  | { t: 'straight'; locked: boolean }
  /** Conduit joining two adjacent sides. Rotation 0 = north–east. */
  | { t: 'bend'; locked: boolean }
  /** Fixed; currents pass straight through on both axes. */
  | { t: 'cross' }
  /** Fixed straight conduit that absorbs pulses of any other kind. */
  | { t: 'gate'; kind: PulseKind }
  | { t: 'emitter'; kind: PulseKind; dir: Dir }
  | { t: 'receiver'; kind: PulseKind };

export interface VoltCourierState {
  width: number;
  height: number;
  /** Row-major, `width * height` entries. Never changes during play. */
  cells: readonly Cell[];
  /** Current rotation (0–3) per cell; ignored for cells without orientation. */
  rotations: readonly number[];
  initialRotations: readonly number[];
  /** Indices of rotated cells, newest last, for undo. */
  history: readonly number[];
  /** Net rotations made by the player (undo subtracts one). */
  turns: number;
  /** Fewest clockwise turns that solve the level from its initial rotations. */
  par: number;
}

export type VoltCourierAction =
  | { type: 'rotate'; index: number }
  | { type: 'undo' }
  | { type: 'reset' };

/** Player-facing names and non-colour symbols for each pulse kind. */
export const PULSE_KIND_INFO: Record<PulseKind, { label: string; symbol: string }> = {
  spark: { label: 'Spark', symbol: '▲' },
  wave: { label: 'Wave', symbol: '●' },
  flux: { label: 'Flux', symbol: '◆' },
};

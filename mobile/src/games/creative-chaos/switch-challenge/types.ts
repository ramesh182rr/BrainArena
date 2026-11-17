import type { DifficultyBand } from '@/game-runtime/contracts';

/**
 * Switch Challenge (W6-G04): infer a hidden state machine.
 *
 * Dials have `levels` positions that wrap round. Each switch nudges some dials
 * up or down by one. Its wiring is hidden until it is first pressed. Some
 * switches only fire while a given dial shows a given level. Reach the target
 * levels within the press budget; Reset restores the machine and budget but
 * keeps the wiring discovered so far.
 */

export interface Effect {
  dial: number;
  delta: 1 | -1;
}

export interface Condition {
  dial: number;
  level: number;
}

export interface MachineSwitch {
  effects: readonly Effect[];
  condition: Condition | null;
}

export interface SwitchState {
  band: DifficultyBand;
  /** Positions per dial (3 or 4); dial values are 0..levels-1 and wrap. */
  levels: number;
  start: readonly number[];
  target: readonly number[];
  dials: readonly number[];
  switches: readonly MachineSwitch[];
  /** Switches whose wiring the player has seen. Survives Reset. */
  discovered: readonly boolean[];
  /** Presses in the current run, in order. */
  presses: readonly number[];
  budget: number;
  resets: number;
  /** The latest press, so the UI can say whether it fired. */
  lastPress: { index: number; fired: boolean } | null;
  /** Fewest presses that reach the target from the start. */
  par: number;
}

export type SwitchAction = { type: 'press'; index: number } | { type: 'reset' };

export const SWITCH_NAMES = ['A', 'B', 'C', 'D', 'E', 'F'] as const;

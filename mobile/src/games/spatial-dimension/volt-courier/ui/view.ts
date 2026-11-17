import { openSides } from '../grid';
import { simulate, type PulseTrace, type SimulationResult } from '../simulate';
import { PULSE_KIND_INFO, type VoltCourierState, type Cell, type Dir, type PulseKind } from '../types';

/**
 * Pure presentation model for the board: which conduits carry current,
 * what is overloaded, and screen-reader text. No React here, so it is unit tested.
 */

export interface CellView {
  index: number;
  row: number;
  col: number;
  cell: Cell;
  rotation: number;
  /** Kind of pulse flowing through, for non-crossing cells. */
  power: PulseKind | null;
  /** Side the current enters from (non-crossing cells), so the flow can be drawn in its direction. */
  flowIn: Dir | null;
  /** Crossings carry up to two currents, one per axis. */
  powerVertical: PulseKind | null;
  powerHorizontal: PulseKind | null;
  /** Receiver powered by a pulse of its own kind. */
  satisfied: boolean;
  overloaded: boolean;
  label: string;
}

export interface BoardView {
  cells: CellView[];
  simulation: SimulationResult;
  pulseLines: string[];
  overloadLines: string[];
}

const SIDE_NAMES = ['north', 'east', 'south', 'west'] as const;

export const position = (width: number, index: number) =>
  `row ${Math.floor(index / width) + 1}, column ${(index % width) + 1}`;

function describeCell(cell: Cell, rotation: number): string {
  const sides = (r: number) => {
    const s = openSides(cell, r);
    return s ? `${SIDE_NAMES[s[0]]} and ${SIDE_NAMES[s[1]]}` : '';
  };
  switch (cell.t) {
    case 'empty':
      return 'Empty';
    case 'straight':
      return `${cell.locked ? 'Locked straight' : 'Straight'} joining ${sides(rotation)}`;
    case 'bend':
      return `${cell.locked ? 'Locked bend' : 'Bend'} joining ${sides(rotation)}`;
    case 'cross':
      return 'Crossing';
    case 'gate':
      return `${PULSE_KIND_INFO[cell.kind].label} gate joining ${sides(rotation)}`;
    case 'emitter':
      return `${PULSE_KIND_INFO[cell.kind].label} ${PULSE_KIND_INFO[cell.kind].symbol} emitter firing ${SIDE_NAMES[cell.dir]}`;
    case 'receiver':
      return `${PULSE_KIND_INFO[cell.kind].label} ${PULSE_KIND_INFO[cell.kind].symbol} receiver`;
  }
}

function describePulse(trace: PulseTrace, width: number): string {
  const { label, symbol } = PULSE_KIND_INFO[trace.kind];
  const head = `${label} ${symbol} from ${position(width, trace.emitterIndex)}`;
  const last = trace.steps[trace.steps.length - 1];
  const where = last ? position(width, last.index) : '';
  switch (trace.outcome) {
    case 'delivered':
      return `${head}: reaches its receiver.`;
    case 'wrong_receiver':
      return `${head}: reaches a receiver of another kind at ${where}.`;
    case 'blocked':
      return `${head}: stops at ${where}.`;
    case 'absorbed':
      return `${head}: is stopped by a gate at ${where}.`;
    case 'escaped':
      return last ? `${head}: leaves the board after ${where}.` : `${head}: leaves the board straight away.`;
    case 'looped':
      return `${head}: circles without reaching a receiver.`;
  }
}

export function buildBoardView(state: VoltCourierState): BoardView {
  const simulation = simulate(state);
  const n = state.cells.length;
  const power: (PulseKind | null)[] = new Array<PulseKind | null>(n).fill(null);
  const powerV: (PulseKind | null)[] = new Array<PulseKind | null>(n).fill(null);
  const powerH: (PulseKind | null)[] = new Array<PulseKind | null>(n).fill(null);
  const satisfied = new Array<boolean>(n).fill(false);
  const flowIn: (Dir | null)[] = new Array<Dir | null>(n).fill(null);

  for (const trace of simulation.traces) {
    trace.steps.forEach((step, i) => {
      const cell = state.cells[step.index] as Cell;
      const isLast = i === trace.steps.length - 1;
      if (cell.t === 'receiver') {
        if (trace.outcome === 'delivered') satisfied[step.index] = true;
        return;
      }
      // A pulse that stopped here never flowed through.
      if (isLast && trace.outcome !== 'looped') return;
      if (cell.t === 'cross') {
        const axis: Dir = step.dir;
        if (axis % 2 === 0) powerV[step.index] = trace.kind;
        else powerH[step.index] = trace.kind;
      } else {
        power[step.index] = trace.kind;
        flowIn[step.index] = ((step.dir + 2) % 4) as Dir;
      }
    });
  }
  // A receiver reached by two pulses is overloaded, not satisfied.
  const overloaded = new Set(simulation.overloadedCells);
  for (const i of overloaded) satisfied[i] = false;

  const cells: CellView[] = state.cells.map((cell, index) => {
    const rotation = state.rotations[index] ?? 0;
    const flows = [power[index], powerV[index], powerH[index]].filter((k): k is PulseKind => k !== null);
    let label = `${position(state.width, index).replace(/^r/, 'R')}. ${describeCell(cell, rotation)}`;
    if (flows.length > 0) label += `, carrying ${flows.map((k) => PULSE_KIND_INFO[k].label.toLowerCase()).join(' and ')}`;
    if (satisfied[index]) label += ', powered';
    if (overloaded.has(index)) label += ', overloaded';
    return {
      index,
      row: Math.floor(index / state.width),
      col: index % state.width,
      cell,
      rotation,
      power: power[index] ?? null,
      flowIn: flowIn[index] ?? null,
      powerVertical: powerV[index] ?? null,
      powerHorizontal: powerH[index] ?? null,
      satisfied: satisfied[index] ?? false,
      overloaded: overloaded.has(index),
      label: `${label}.`,
    };
  });

  return {
    cells,
    simulation,
    pulseLines: simulation.traces.map((t) => describePulse(t, state.width)),
    overloadLines: simulation.overloadedCells.map(
      (i) => `Overload at ${position(state.width, i)}: two pulses share it.`,
    ),
  };
}

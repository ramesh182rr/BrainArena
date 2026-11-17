import { contrastRatio } from '@/design-system/contrast';

import { voltCourier } from '../../module';
import { applyAll, boardState, solvingActions } from '../../__tests__/helpers';
import { boardColors, pulseColors } from '../theme';
import { buildBoardView } from '../view';

describe('buildBoardView', () => {
  const state = voltCourier.createLevel('tutorial-1', 'intro').initialState;

  it('describes every cell with its position and meaning', () => {
    const view = buildBoardView(state);
    expect(view.cells).toHaveLength(state.width * state.height);
    expect(view.cells[0]?.label).toBe('Row 1, column 1. Spark ▲ emitter firing east.');
    expect(view.cells[1]?.label).toMatch(/^Row 1, column 2\. Straight joining north and south\.$/);
    expect(view.cells[4]?.label).toBe('Row 2, column 1. Empty.');
  });

  it('reports blocked pulses in words', () => {
    expect(buildBoardView(state).pulseLines).toEqual(['Spark ▲ from row 1, column 1: stops at row 1, column 2.']);
  });

  it('marks powered conduits and satisfied receivers when solved', () => {
    const solved = applyAll(state, solvingActions(state));
    const view = buildBoardView(solved);
    expect(view.simulation.solved).toBe(true);
    expect(view.pulseLines).toEqual(['Spark ▲ from row 1, column 1: reaches its receiver.']);
    const receiver = view.cells.find((c) => c.cell.t === 'receiver');
    expect(receiver?.satisfied).toBe(true);
    expect(receiver?.label).toMatch(/powered\.$/);
    expect(view.cells[1]?.power).toBe('spark');
    // The spark enters (row 1, column 2) from the west.
    expect(view.cells[1]?.flowIn).toBe(3);
    expect(view.cells[1]?.label).toMatch(/carrying spark\.$/);
  });

  it('tracks each axis of a crossing separately', () => {
    const s = boardState(['..  EwS ..', 'EsE X   Rs', '..  Rw  ..']);
    const cross = buildBoardView(s).cells[4];
    expect(cross?.powerHorizontal).toBe('spark');
    expect(cross?.powerVertical).toBe('wave');
    expect(cross?.label).toMatch(/carrying wave and spark|carrying spark and wave/);
  });

  it('flags overloads in the cells and in words', () => {
    const view = buildBoardView(boardState(['EsE S1 S1 EwW', 'Rs  .. .. Rw']));
    expect(view.cells[1]?.overloaded).toBe(true);
    expect(view.cells[1]?.label).toMatch(/overloaded\.$/);
    expect(view.overloadLines).toEqual([
      'Overload at row 1, column 2: two pulses share it.',
      'Overload at row 1, column 3: two pulses share it.',
    ]);
  });

  it('describes absorbed and escaping pulses', () => {
    expect(buildBoardView(boardState(['EwE Gs1 Rw', '..  ..  ..'])).pulseLines[0]).toMatch(/stopped by a gate at row 1, column 2/);
    expect(buildBoardView(boardState(['EsN Rs', '..  ..'])).pulseLines[0]).toMatch(/leaves the board straight away/);
  });
});

describe('board colours', () => {
  it.each(Object.entries(pulseColors))('%s pulses stand out from tiles (3:1)', (_k, color) => {
    expect(contrastRatio(color, boardColors.tile)).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(color, boardColors.fixedTile)).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(boardColors.onPulse, color)).toBeGreaterThanOrEqual(3);
  });

  it('unpowered conduits stand out from tiles', () => {
    expect(contrastRatio(boardColors.conduit, boardColors.tile)).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(boardColors.conduit, boardColors.fixedTile)).toBeGreaterThanOrEqual(3);
  });
});

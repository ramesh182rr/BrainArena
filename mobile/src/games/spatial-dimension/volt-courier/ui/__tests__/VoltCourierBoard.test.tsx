import { fireEvent, render, screen } from '@testing-library/react-native';

import { voltCourier } from '../../module';
import { VoltCourierBoard } from '../VoltCourierBoard';

const state = voltCourier.createLevel('tutorial-1', 'intro').initialState;

describe('VoltCourierBoard', () => {
  it('renders one labelled element per cell', async () => {
    await render(<VoltCourierBoard state={state} onAction={() => {}} highlightIds={[]} disabled={false} />);
    expect(screen.getByLabelText('Row 1, column 1. Spark ▲ emitter firing east.')).toBeTruthy();
    for (let i = 0; i < state.cells.length; i += 1) expect(screen.getByTestId(`cell-${i}`)).toBeTruthy();
  });

  it('only rotatable conduits are buttons, and tapping one asks to rotate it', async () => {
    const onAction = jest.fn();
    await render(<VoltCourierBoard state={state} onAction={onAction} highlightIds={[]} disabled={false} />);
    const rotatable = state.cells.filter((c) => (c.t === 'straight' || c.t === 'bend') && !c.locked).length;
    expect(screen.getAllByRole('button')).toHaveLength(rotatable);
    await fireEvent.press(screen.getByTestId('cell-1'));
    expect(onAction).toHaveBeenCalledWith({ type: 'rotate', index: 1 });
    await fireEvent.press(screen.getByTestId('cell-0'));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('ignores taps while disabled', async () => {
    const onAction = jest.fn();
    await render(<VoltCourierBoard state={state} onAction={onAction} highlightIds={[]} disabled />);
    await fireEvent.press(screen.getByTestId('cell-1'));
    expect(onAction).not.toHaveBeenCalled();
  });

  it('shows where each pulse ends up as text', async () => {
    await render(<VoltCourierBoard state={state} onAction={() => {}} highlightIds={[]} disabled={false} />);
    expect(screen.getByText('Spark ▲ from row 1, column 1: stops at row 1, column 2.')).toBeTruthy();
  });
});

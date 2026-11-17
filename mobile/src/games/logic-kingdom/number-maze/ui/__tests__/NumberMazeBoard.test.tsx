import { fireEvent, render, screen } from '@testing-library/react-native';

import { numberMaze } from '../../module';
import { NumberMazeBoard } from '../NumberMazeBoard';

const state = numberMaze.createLevel('tutorial-1', 'intro').initialState;

describe('NumberMazeBoard', () => {
  it('shows the current value, target and range', async () => {
    await render(<NumberMazeBoard state={state} onAction={() => {}} highlightIds={[]} disabled={false} />);
    expect(screen.getByLabelText('Now: 5')).toBeTruthy();
    expect(screen.getByLabelText('Target: 9')).toBeTruthy();
    expect(screen.getByLabelText('Range: 0–20')).toBeTruthy();
  });

  it('moves into a legal room', async () => {
    const onAction = jest.fn();
    await render(<NumberMazeBoard state={state} onAction={onAction} highlightIds={[]} disabled={false} />);
    await fireEvent.press(screen.getByTestId('room-1'));
    expect(onAction).toHaveBeenCalledWith({ type: 'move', index: 1 });
  });

  it('explains a refused room instead of moving', async () => {
    const onAction = jest.fn();
    await render(<NumberMazeBoard state={state} onAction={onAction} highlightIds={[]} disabled={false} />);
    await fireEvent.press(screen.getByTestId('room-8'));
    expect(onAction).not.toHaveBeenCalled();
    expect(screen.getByText('Move one room at a time, up, down, left or right.')).toBeTruthy();
  });

  it('does nothing while disabled', async () => {
    const onAction = jest.fn();
    await render(<NumberMazeBoard state={state} onAction={onAction} highlightIds={[]} disabled />);
    await fireEvent.press(screen.getByTestId('room-1'));
    expect(onAction).not.toHaveBeenCalled();
  });
});

import { fireEvent, render, screen } from '@testing-library/react-native';

import { switchChallenge } from '../../module';
import { SwitchChallengeBoard } from '../SwitchChallengeBoard';

const s = switchChallenge.createLevel('tutorial-1', 'intro').initialState;

describe('SwitchChallengeBoard', () => {
  it('labels dials and presses a switch', async () => {
    const onAction = jest.fn();
    await render(<SwitchChallengeBoard state={s} onAction={onAction} highlightIds={[]} disabled={false} />);
    expect(screen.getByLabelText('Dial 1: showing 0, target 1.')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Switch A. Wiring unknown.' }));
    expect(onAction).toHaveBeenCalledWith({ type: 'press', index: 0 });
  });

  it('disables switches when out of presses', async () => {
    let out = s;
    for (let i = 0; i < s.budget; i += 1) out = switchChallenge.reduce(out, { type: 'press', index: 1 });
    const onAction = jest.fn();
    await render(<SwitchChallengeBoard state={out} onAction={onAction} highlightIds={[]} disabled={false} />);
    await fireEvent.press(screen.getByTestId('switch-0'));
    expect(onAction).not.toHaveBeenCalled();
    expect(screen.getByText(/Out of presses/)).toBeTruthy();
  });
});

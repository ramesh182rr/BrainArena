import { fireEvent, render, screen } from '@testing-library/react-native';

import { colourCascade } from '../../module';
import { ColourCascadeBoard } from '../ColourCascadeBoard';

const s = colourCascade.createLevel('tutorial-2', 'easy').initialState;

describe('ColourCascadeBoard', () => {
  it('shows the feeding cycle and droplet counts', async () => {
    await render(<ColourCascadeBoard state={s} onAction={() => {}} highlightIds={[]} disabled={false} />);
    expect(screen.getByLabelText('Feeding cycle: Rose eats Leaf, Leaf eats Sky, Sky eats Rose.')).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Sky droplets: 1' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Rose droplets: 0' })).toBeDisabled();
  });

  it('drops the selected colour on a pad', async () => {
    const onAction = jest.fn();
    await render(<ColourCascadeBoard state={s} onAction={onAction} highlightIds={[]} disabled={false} />);
    await fireEvent.press(screen.getByRole('radio', { name: 'Sky droplets: 1' }));
    await fireEvent.press(screen.getByTestId('plot-8'));
    expect(onAction).toHaveBeenCalledWith({ type: 'drop', index: 8, colour: 'sky' });
  });

  it('explains a tap that is not on a pad', async () => {
    const onAction = jest.fn();
    await render(<ColourCascadeBoard state={s} onAction={onAction} highlightIds={[]} disabled={false} />);
    await fireEvent.press(screen.getByTestId('plot-1'));
    expect(onAction).not.toHaveBeenCalled();
    expect(screen.getByText('Droplets only go on watering pads (the dashed gold rings).')).toBeTruthy();
  });
});

describe('ColourCascadeBoard when stuck', () => {
  it('says the droplets ran out', async () => {
    const wrong = [
      { type: 'drop', index: 0, colour: 'leaf' },
      { type: 'drop', index: 8, colour: 'sky' },
    ] as const;
    const stuck = wrong.reduce((x, a) => colourCascade.reduce(x, a), s);
    await render(<ColourCascadeBoard state={stuck} onAction={() => {}} highlightIds={[]} disabled={false} />);
    expect(screen.getByText(/Out of droplets: undo or reset/)).toBeTruthy();
  });
});

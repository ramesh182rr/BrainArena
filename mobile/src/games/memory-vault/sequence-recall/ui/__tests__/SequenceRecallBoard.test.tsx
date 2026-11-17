import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { sequenceRecall } from '../../module';
import { expectedAnswer } from '../../rules';
import { SequenceRecallBoard } from '../SequenceRecallBoard';
import { itemLabel, roundTitle } from '../view';

const s = sequenceRecall.createLevel('board', 'intro').initialState;

describe('SequenceRecallBoard', () => {
  it('starts with the round card and a Watch button', async () => {
    const onAction = jest.fn();
    await render(<SequenceRecallBoard state={s} onAction={onAction} highlightIds={[]} disabled={false} />);
    expect(screen.getByText(roundTitle(s))).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Watch' }));
    expect(onAction).toHaveBeenCalledWith({ type: 'watch' });
  });

  it('shows each item in turn, captions it, then reports the show finished', async () => {
    jest.useFakeTimers();
    const onAction = jest.fn();
    const showing = sequenceRecall.reduce(s, { type: 'watch' });
    await render(<SequenceRecallBoard state={showing} onAction={onAction} highlightIds={[]} disabled={false} />);
    await act(async () => {
      jest.advanceTimersByTime(400);
    });
    expect(screen.getByText(itemLabel(showing, showing.sequence[0]!))).toBeTruthy();
    await act(async () => {
      jest.advanceTimersByTime(showing.showMs * showing.sequence.length + 400);
    });
    expect(onAction).toHaveBeenCalledWith({ type: 'shown' });
    jest.useRealTimers();
  });

  it('does not run the show while paused', async () => {
    jest.useFakeTimers();
    const onAction = jest.fn();
    const showing = sequenceRecall.reduce(s, { type: 'watch' });
    await render(<SequenceRecallBoard state={showing} onAction={onAction} highlightIds={[]} disabled />);
    await act(async () => {
      jest.advanceTimersByTime(20_000);
    });
    expect(onAction).not.toHaveBeenCalled();
    expect(screen.getByText('Paused. The show restarts when you resume.')).toBeTruthy();
    jest.useRealTimers();
  });

  it('answers on the place pads for a places round', async () => {
    const onAction = jest.fn();
    const answering = sequenceRecall.reduce(sequenceRecall.reduce(s, { type: 'watch' }), { type: 'shown' });
    await render(<SequenceRecallBoard state={answering} onAction={onAction} highlightIds={[]} disabled={false} />);
    expect(screen.getByText('Tap the PLACES in the order they lit up.')).toBeTruthy();
    const first = expectedAnswer(answering.sequence, 'places')[0]!;
    await fireEvent.press(screen.getByTestId(`place-${first}`));
    expect(onAction).toHaveBeenCalledWith({ type: 'input', value: first });
  });

  it('shows a slot-by-slot comparison after a miss', async () => {
    let st = sequenceRecall.reduce(sequenceRecall.reduce(s, { type: 'watch' }), { type: 'shown' });
    const wrong = expectedAnswer(st.sequence, 'places').map((v) => (v + 1) % 4);
    for (const value of wrong) st = sequenceRecall.reduce(st, { type: 'input', value });
    await render(<SequenceRecallBoard state={st} onAction={() => {}} highlightIds={[]} disabled={false} />);
    expect(screen.getByText('Not quite. Here is how it went:')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Try a fresh sequence' })).toBeTruthy();
  });
});

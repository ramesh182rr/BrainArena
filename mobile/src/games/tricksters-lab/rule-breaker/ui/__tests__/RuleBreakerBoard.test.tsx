import { fireEvent, render, screen } from '@testing-library/react-native';

import { ruleBreaker } from '../../module';
import { passes } from '../../rules';
import { RuleBreakerBoard } from '../RuleBreakerBoard';

const lab = ruleBreaker.createLevel('tutorial-1', 'intro').initialState;

describe('RuleBreakerBoard', () => {
  it('scans a specimen', async () => {
    const onAction = jest.fn();
    await render(<RuleBreakerBoard state={lab} onAction={onAction} highlightIds={[]} disabled={false} />);
    expect(screen.getByText('Tap a specimen to scan it against the hidden rule.')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('specimen-0'));
    expect(onAction).toHaveBeenCalledWith({ type: 'test', index: 0 });
  });

  it('shows the scanner result and cause', async () => {
    const tested = ruleBreaker.reduce(lab, { type: 'test', index: 1 });
    await render(<RuleBreakerBoard state={tested} onAction={() => {}} highlightIds={[]} disabled={false} />);
    expect(screen.getByText('FAIL')).toBeTruthy();
    expect(screen.getByText('Caused by shape.')).toBeTruthy();
  });

  it('submits exam answers only once every specimen is marked', async () => {
    const exam = ruleBreaker.reduce(lab, { type: 'startExam' });
    const onAction = jest.fn();
    await render(<RuleBreakerBoard state={exam} onAction={onAction} highlightIds={[]} disabled={false} />);
    const submit = screen.getByRole('button', { name: 'Submit answers' });
    expect(submit).toBeDisabled();
    const batch = exam.exams[0]!;
    for (let i = 0; i < batch.length; i += 1) {
      const radios = screen.getAllByRole('radio').filter((r) => r.props.accessibilityLabel?.endsWith(passes(exam.rule, batch[i]!) ? 'PASS' : 'FAIL'));
      await fireEvent.press(radios[i]!);
    }
    await fireEvent.press(screen.getByRole('button', { name: 'Submit answers' }));
    expect(onAction).toHaveBeenCalledWith({ type: 'submitExam', answers: batch.map((s) => passes(exam.rule, s)) });
  });
});

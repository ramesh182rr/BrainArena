import { switchChallenge } from '../../module';
import { dialLabel, statusMessage, switchLabel, wiringText } from '../view';

const t3 = () => switchChallenge.createLevel('tutorial-3', 'advanced').initialState;

describe('Switch Challenge view', () => {
  it('labels dials and hides undiscovered wiring', () => {
    const s = t3();
    expect(dialLabel(s, 0)).toBe('Dial 1: showing 0, target 1.');
    expect(switchLabel(s, 1)).toBe('Switch B. Wiring unknown.');
  });

  it('describes wiring once discovered, including locks', () => {
    const s = switchChallenge.reduce(t3(), { type: 'press', index: 1 });
    expect(switchLabel(s, 1)).toBe('Switch B. Raises dial 2. Only works while dial 1 shows 1.');
    expect(wiringText({ effects: [{ dial: 0, delta: -1 }, { dial: 2, delta: 1 }], condition: null })).toBe('Lowers dial 1, raises dial 3.');
  });

  it('explains presses, locks and running out', () => {
    const s = t3();
    expect(statusMessage(s)).toBe('Press a switch to reveal its wiring.');
    expect(statusMessage(switchChallenge.reduce(s, { type: 'press', index: 1 }))).toBe('Switch B is locked: dial 1 must show 1.');
    expect(statusMessage(switchChallenge.reduce(s, { type: 'press', index: 0 }))).toBe('Switch A fired.');
    let out = s;
    for (let i = 0; i < s.budget; i += 1) out = switchChallenge.reduce(out, { type: 'press', index: 2 });
    expect(statusMessage(out)).toMatch(/Out of presses/);
  });
});

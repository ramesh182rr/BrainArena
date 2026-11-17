import { parseMachine } from '../authored';
import { applySwitch, shortestPresses } from '../rules';

describe('applySwitch', () => {
  it('raises and lowers dials with wrap-around', () => {
    expect(applySwitch([0, 2, 1], { effects: [{ dial: 0, delta: -1 }, { dial: 1, delta: 1 }], condition: null }, 3)).toEqual({ dials: [2, 0, 1], fired: true });
  });

  it('a conditional switch fires only while its dial shows the level', () => {
    const sw = { effects: [{ dial: 2, delta: 1 as const }], condition: { dial: 0, level: 1 } };
    expect(applySwitch([0, 0, 0], sw, 3)).toEqual({ dials: [0, 0, 0], fired: false });
    expect(applySwitch([1, 0, 0], sw, 3)).toEqual({ dials: [1, 0, 1], fired: true });
  });
});

describe('shortestPresses', () => {
  it('finds the shortest sequence, respecting order for locked switches', () => {
    const m = parseMachine('levels=3 start=000 target=120 slack=3', ['+0', '+1 ?0=1', '+1 +2']);
    // The locked switch B needs dial 0 at 1 first, so A must come before B.
    const path = shortestPresses(m.switches, m.levels, m.start, m.target)!;
    expect(path).toHaveLength(3);
    expect(path.indexOf(0)).toBeLessThan(path.lastIndexOf(1));
  });

  it('returns null when the target is unreachable or beyond the limit', () => {
    const m = parseMachine('levels=3 start=00 target=12 slack=3', ['+0 +1']);
    expect(shortestPresses(m.switches, m.levels, m.start, m.target)).toBeNull();
    const far = parseMachine('levels=4 start=00 target=33 slack=3', ['+0 +1']);
    expect(shortestPresses(far.switches, far.levels, far.start, far.target, 2)).toBeNull();
    expect(shortestPresses(far.switches, far.levels, far.start, far.target, 3)).toEqual([0, 0, 0]);
  });
});

describe('parseMachine', () => {
  it('rejects malformed machines', () => {
    expect(() => parseMachine('levels=5 start=00 target=11', ['+0'])).toThrow();
    expect(() => parseMachine('levels=3 start=00 target=13', ['+0'])).toThrow();
    expect(() => parseMachine('levels=3 start=00 target=11', ['+9'])).toThrow();
    expect(() => parseMachine('levels=3 start=00 target=11', ['x0'])).toThrow();
  });
});

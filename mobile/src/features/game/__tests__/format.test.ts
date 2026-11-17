import { capitalise, formatDuration } from '../format';

describe('format', () => {
  it.each([
    [0, '0 s'],
    [-500, '0 s'],
    [42_400, '42 s'],
    [60_000, '1 min 00 s'],
    [185_000, '3 min 05 s'],
  ])('formatDuration(%i) = %s', (ms, text) => {
    expect(formatDuration(ms)).toBe(text);
  });

  it('capitalises', () => {
    expect(capitalise('expert')).toBe('Expert');
    expect(capitalise('')).toBe('');
  });
});

import { buildRecallState, RECALL_PROFILES } from '../generator';
import { expectedAnswer, sequenceFor } from '../rules';

const s = buildRecallState('expert', 'seed-a', RECALL_PROFILES.expert);

describe('sequenceFor', () => {
  it('is deterministic per seed, round and attempt', () => {
    expect(sequenceFor(s, 1, 0)).toEqual(sequenceFor(s, 1, 0));
    expect(sequenceFor(s, 1, 0)).not.toEqual(sequenceFor(s, 1, 1));
    expect(sequenceFor(s, 1, 0)).not.toEqual(sequenceFor({ ...s, seed: 'seed-b' }, 1, 0));
  });

  it('matches the round length and never repeats a place or symbol back to back', () => {
    for (let attempt = 0; attempt < 50; attempt += 1) {
      for (let round = 0; round < s.rounds.length; round += 1) {
        const seq = sequenceFor(s, round, attempt);
        expect(seq).toHaveLength(s.rounds[round]!.length);
        seq.forEach((it, i) => {
          expect(it.place).toBeLessThan(9);
          expect(it.symbol).toBeLessThan(s.palette.length);
          if (i > 0) {
            expect(it.place).not.toBe(seq[i - 1]!.place);
            expect(it.symbol).not.toBe(seq[i - 1]!.symbol);
          }
        });
      }
    }
  });

  it('returns nothing past the last round', () => {
    expect(sequenceFor(s, 99, 0)).toEqual([]);
  });
});

describe('expectedAnswer', () => {
  const seq = [
    { place: 0, symbol: 2 },
    { place: 3, symbol: 1 },
    { place: 1, symbol: 0 },
  ];
  it.each([
    ['places', [0, 3, 1]],
    ['symbols', [2, 1, 0]],
    ['reversePlaces', [1, 3, 0]],
    ['reverseSymbols', [0, 1, 2]],
  ] as const)('%s → %j', (channel, expected) => {
    expect(expectedAnswer(seq, channel)).toEqual(expected);
  });
});

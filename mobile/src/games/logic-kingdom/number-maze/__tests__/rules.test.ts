import { applyOp, checkMove, describeProblem, neighbors } from '../rules';
import { mazeState } from './helpers';

describe('applyOp', () => {
  it('does integer arithmetic and refuses inexact division', () => {
    expect(applyOp('add', 3, 4)).toBe(7);
    expect(applyOp('sub', 5, 4)).toBe(-1);
    expect(applyOp('mul', 3, 4)).toBe(12);
    expect(applyOp('div', 2, 8)).toBe(4);
    expect(applyOp('div', 3, 8)).toBeNull();
    expect(applyOp('div', 0, 8)).toBeNull();
  });
});

describe('neighbors', () => {
  it('lists orthogonal neighbours inside the grid', () => {
    expect(neighbors(3, 3, 4).sort()).toEqual([1, 3, 5, 7]);
    expect(neighbors(3, 3, 0).sort()).toEqual([1, 3]);
    expect(neighbors(3, 3, 8).sort()).toEqual([5, 7]);
  });
});

describe('checkMove', () => {
  //  S(5) +2  -1
  //  +20  ##  /2
  //  EV   OD  E      target 7, bounds 0..20
  const s = mazeState('start=5 target=7 min=0 max=20', ['S  +2 -1', '+20 ## /2', 'EV OD E']);

  it('allows a legal step and reports the new value', () => {
    expect(checkMove(s, 1)).toEqual({ ok: true, value: 7 });
  });

  it.each([
    ['not adjacent', 2, 'not_adjacent'],
    ['diagonal', 4, 'not_adjacent'],
    ['above the maximum', 3, 'above_max'],
    ['off the board', 99, 'not_adjacent'],
  ])('refuses a move that is %s', (_name, index, problem) => {
    expect(checkMove(s, index)).toMatchObject({ ok: false, problem });
  });

  it('refuses sealed rooms, revisits, inexact division, closed exits and wrong locks', () => {
    const atTwo = { ...s, path: [0, 1, 2], values: [5, 7, 6] };
    expect(checkMove(atTwo, 5)).toEqual({ ok: true, value: 3 });
    const atFive = { ...s, path: [0, 1, 2, 5], values: [5, 7, 6, 3] };
    expect(checkMove(atFive, 4)).toMatchObject({ problem: 'blocked' });
    expect(checkMove(atFive, 2)).toMatchObject({ problem: 'visited' });
    expect(checkMove(atFive, 8)).toMatchObject({ problem: 'exit_closed' });
    const odd = { ...s, path: [0, 3], values: [5, 25], max: 30 };
    expect(checkMove(odd, 6)).toMatchObject({ problem: 'lock_even' });
    const at7 = { ...s, path: [0, 1, 2, 5], values: [5, 7, 6, 7] };
    expect(checkMove(at7, 8)).toEqual({ ok: true, value: 7 });
    expect(checkMove({ ...s, path: [0, 1, 2, 5, 8], values: [5, 7, 6, 3, 7] }, 7)).toMatchObject({ problem: 'finished' });
  });

  it('explains refusals in plain words', () => {
    const tooBig = checkMove(s, 3);
    expect(describeProblem(s, tooBig)).toBe('That would rise to 25, above the maximum of 20.');
    const atFive = { ...s, path: [0, 1, 2, 5], values: [5, 7, 6, 3] };
    expect(describeProblem(atFive, checkMove(atFive, 8))).toBe('The exit only opens at exactly 7.');
  });
});

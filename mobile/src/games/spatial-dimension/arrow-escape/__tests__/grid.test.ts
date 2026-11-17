import { candidateRotations, exitDir, neighbor, openSides, rotationFor, sameOrientation, turnsBetween } from '../grid';
import type { Cell, Dir } from '../types';

const straight: Cell = { t: 'straight', locked: false };
const bend: Cell = { t: 'bend', locked: false };
const cross: Cell = { t: 'cross' };
const N = 0, E = 1, S = 2, W = 3;

describe('neighbor', () => {
  it('moves within a 3x2 board and stops at edges', () => {
    expect(neighbor(3, 2, 0, E)).toBe(1);
    expect(neighbor(3, 2, 0, S)).toBe(3);
    expect(neighbor(3, 2, 0, N)).toBeNull();
    expect(neighbor(3, 2, 0, W)).toBeNull();
    expect(neighbor(3, 2, 2, E)).toBeNull();
    expect(neighbor(3, 2, 5, S)).toBeNull();
  });
});

describe('openSides', () => {
  it('rotates straights and bends clockwise', () => {
    expect(openSides(straight, 0)).toEqual([N, S]);
    expect(openSides(straight, 1)).toEqual([E, W]);
    expect(openSides(bend, 0)).toEqual([N, E]);
    expect(openSides(bend, 1)).toEqual([E, S]);
    expect(openSides(bend, 3)).toEqual([W, N]);
    expect(openSides(cross, 0)).toBeNull();
  });
});

describe('exitDir', () => {
  it('passes straight through an aligned straight and blocks a misaligned one', () => {
    expect(exitDir(straight, 1, E)).toBe(E);
    expect(exitDir(straight, 0, E)).toBeNull();
  });

  it('turns through a bend from either open side', () => {
    // Bend 0 opens north and east.
    expect(exitDir(bend, 0, S)).toBe(E); // enters from north
    expect(exitDir(bend, 0, W)).toBe(N); // enters from east
    expect(exitDir(bend, 0, E)).toBeNull(); // west side closed
  });

  it('lets crossings pass on both axes', () => {
    for (const d of [N, E, S, W] as Dir[]) expect(exitDir(cross, 0, d)).toBe(d);
  });
});

describe('orientation maths', () => {
  it('treats opposite straight rotations as the same orientation', () => {
    expect(sameOrientation(straight, 0, 2)).toBe(true);
    expect(sameOrientation(straight, 1, 2)).toBe(false);
    expect(sameOrientation(bend, 0, 2)).toBe(false);
  });

  it('counts clockwise turns, using straight symmetry', () => {
    expect(turnsBetween(bend, 0, 3)).toBe(3);
    expect(turnsBetween(bend, 3, 0)).toBe(1);
    expect(turnsBetween(straight, 0, 3)).toBe(1);
    expect(turnsBetween(straight, 1, 3)).toBe(0);
  });

  it('offers only rotations that accept the incoming pulse', () => {
    expect(candidateRotations(straight, 0, E)).toEqual([1]);
    expect(candidateRotations(straight, 3, E)).toEqual([3]);
    const bends = candidateRotations(bend, 0, E); // enters from west
    expect([...bends].sort()).toEqual([2, 3]);
    for (const r of bends) expect(exitDir(bend, r, E)).not.toBeNull();
  });

  it('derives the tile that joins an entry and exit direction', () => {
    expect(rotationFor(E, E)).toEqual({ t: 'straight', rotation: 1 });
    expect(rotationFor(S, S)).toEqual({ t: 'straight', rotation: 0 });
    const turn = rotationFor(E, S);
    expect(turn.t).toBe('bend');
    expect(exitDir(bend, turn.rotation, E)).toBe(S);
    expect(() => rotationFor(E, W)).toThrow('cannot reverse');
  });
});

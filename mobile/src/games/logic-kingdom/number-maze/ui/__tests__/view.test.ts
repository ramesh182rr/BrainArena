import { contrastRatio } from '@/design-system/contrast';

import { numberMaze } from '../../module';
import { applyAll } from '../../__tests__/helpers';
import { mazeColors, opColors } from '../theme';
import { buildMazeView, legalMoves, roomFace } from '../view';

const t1 = () => numberMaze.createLevel('tutorial-1', 'intro').initialState;

describe('buildMazeView', () => {
  it('labels the current room, legal steps and their results', () => {
    const view = buildMazeView(t1());
    expect(view[0]?.label).toBe('Row 1, column 1. Start. You are here, value 5.');
    expect(view[1]?.label).toBe('Row 1, column 2. Add 2. Can step here, value becomes 7.');
    expect(view[4]?.label).toBe('Row 2, column 2. Sealed room.');
    expect(view[8]?.label).toBe('Row 3, column 3. Exit, opens at 9.');
    expect(legalMoves(t1()).sort()).toEqual([1, 3]);
  });

  it('marks visited rooms with the value they gave', () => {
    const s = applyAll(t1(), [{ type: 'move', index: 1 }, { type: 'move', index: 2 }]);
    const view = buildMazeView(s);
    expect(view[1]).toMatchObject({ step: 1, value: 7, current: false });
    expect(view[2]).toMatchObject({ step: 2, value: 6, current: true });
    expect(view[1]?.label).toMatch(/Visited, value was 7\./);
  });

  it('explains why a neighbouring room is refused', () => {
    const s = applyAll(t1(), [{ type: 'move', index: 3 }, { type: 'move', index: 6 }, { type: 'move', index: 7 }]);
    expect(buildMazeView(s)[8]?.label).toMatch(/The exit only opens at exactly 9\./);
  });

  it('prints operations as text so colour is never the only cue', () => {
    expect(roomFace({ t: 'gate', op: 'mul', n: 3 })).toBe('×3');
    expect(roomFace({ t: 'gate', op: 'sub', n: 2 })).toBe('−2');
    expect(roomFace({ t: 'lock', rule: 'odd' })).toBe('ODD');
  });
});

describe('maze colours', () => {
  it.each(Object.entries(opColors))('%s rooms keep white text readable', (_op, bg) => {
    expect(contrastRatio(mazeColors.roomText, bg)).toBeGreaterThanOrEqual(4.5);
  });

  it('lock and orb text are readable', () => {
    expect(contrastRatio(mazeColors.lockAccent, mazeColors.lock)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(mazeColors.orbText, mazeColors.orb)).toBeGreaterThanOrEqual(4.5);
  });
});

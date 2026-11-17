import { checkMove, currentIndex, currentValue, describeProblem, type MoveCheck } from '../rules';
import { OP_SYMBOL, OP_WORD, type MazeCell, type NumberMazeState } from '../types';

export interface RoomView {
  index: number;
  cell: MazeCell;
  /** Position in the player's route, or null if not visited. */
  step: number | null;
  /** Value after entering this room on the current route. */
  value: number | null;
  current: boolean;
  check: MoveCheck;
  /** Short text printed on the room. */
  face: string;
  label: string;
}

export function roomFace(cell: MazeCell): string {
  switch (cell.t) {
    case 'gate':
      return `${OP_SYMBOL[cell.op]}${cell.n}`;
    case 'lock':
      return cell.rule === 'even' ? 'EVEN' : 'ODD';
    case 'start':
      return 'START';
    case 'exit':
      return 'EXIT';
    case 'block':
      return '';
  }
}

function describeRoom(cell: MazeCell, target: number): string {
  switch (cell.t) {
    case 'gate':
      return `${OP_WORD[cell.op]} ${cell.n}`;
    case 'lock':
      return `${cell.rule === 'even' ? 'Even' : 'Odd'} lock`;
    case 'start':
      return 'Start';
    case 'exit':
      return `Exit, opens at ${target}`;
    case 'block':
      return 'Sealed room';
  }
}

export function buildMazeView(state: NumberMazeState): RoomView[] {
  const here = currentIndex(state);
  return state.cells.map((cell, index) => {
    const step = state.path.indexOf(index);
    const visited = step >= 0;
    const check = checkMove(state, index);
    const value = visited ? (state.values[step] as number) : null;
    let status: string;
    if (index === here) status = `You are here, value ${currentValue(state)}`;
    else if (visited) status = `Visited, value was ${value}`;
    else if (check.ok) status = `Can step here, value becomes ${check.value}`;
    else if (check.problem === 'not_adjacent' || cell.t === 'block') status = '';
    else status = describeProblem(state, check);
    const position = `Row ${Math.floor(index / state.width) + 1}, column ${(index % state.width) + 1}`;
    return {
      index,
      cell,
      step: visited ? step : null,
      value,
      current: index === here,
      check,
      face: roomFace(cell),
      label: [position, describeRoom(cell, state.target), status].filter(Boolean).join('. ') + '.',
    };
  });
}

export function legalMoves(state: NumberMazeState): number[] {
  return buildMazeView(state).filter((r) => r.check.ok).map((r) => r.index);
}

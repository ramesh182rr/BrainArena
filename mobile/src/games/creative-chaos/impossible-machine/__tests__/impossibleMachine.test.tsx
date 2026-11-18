import { fireEvent, render, screen } from '@testing-library/react-native';

import { DIFFICULTY_BANDS } from '@/game-runtime/contracts';
import { makeDeps } from '@/game-runtime/__tests__/testGame';
import { startSession, submitAction } from '@/game-runtime/session';

import { impossibleMachineUi } from '../board';
import { apply, impossibleMachine, MACHINE_PROFILES, MACHINE_TUTORIALS, runChain, solveMachine, type MachineState } from '../logic';

jest.setTimeout(120_000);

function build(s0: MachineState): MachineState {
  const sol = solveMachine(s0, s0.slots.length, 1)[0]!;
  let s = s0;
  sol.forEach((item, i) => {
    s = impossibleMachine.reduce(s, { type: 'pick', item });
    s = impossibleMachine.reduce(s, { type: 'slot', index: i });
  });
  return impossibleMachine.reduce(s, { type: 'run' });
}

describe('Impossible Machine modules', () => {
  it('reshape an 8-count rhythm', () => {
    const p = 0b00010011;
    expect(apply('delay', p)).toBe(0b00100110);
    expect(apply('delay', 0b10000000)).toBe(0b00000001);
    expect(apply('echo', 0b00000001)).toBe(0b00000011);
    expect(apply('thin', 0b11111111)).toBe(0b01010101);
    expect(apply('flip', 0b11110000)).toBe(0b00001111);
    expect(apply('mirror', 0b00000001)).toBe(0b10000000);
  });

  it('order matters', () => {
    const p = 0b00000011;
    expect(runChain(p, ['thin', 'delay'])).not.toBe(runChain(p, ['delay', 'thin']));
  });
});

describe('Impossible Machine levels', () => {
  it.each(DIFFICULTY_BANDS)('%s: 200 seeds have one solution order', (band) => {
    const p = MACHINE_PROFILES[band];
    for (let i = 0; i < 200; i += 1) {
      const level = impossibleMachine.createLevel(`p-${i}`, band);
      expect({ i, ok: impossibleMachine.validateLevel(level).valid }).toEqual({ i, ok: true });
      const s = level.initialState;
      expect(s.slots).toHaveLength(p.slots);
      expect(s.inventory).toHaveLength(p.inventory);
      expect(new Set(solveMachine(s, p.slots).map((sol) => sol.map((x) => s.inventory[x]).join())).size).toBe(1);
    }
    expect(impossibleMachine.createLevel('d', band)).toEqual(impossibleMachine.createLevel('d', band));
    expect(impossibleMachine.validateLevel(impossibleMachine.fallbackLevel(band)).valid).toBe(true);
  });

  it('tutorials validate; placing, swapping out and running work; the right order completes; scores', () => {
    for (const t of MACHINE_TUTORIALS) expect(impossibleMachine.validateLevel(impossibleMachine.createLevel(t.id, t.difficulty)).valid).toBe(true);
    const s0 = impossibleMachine.createLevel('tutorial-2', 'easy').initialState;
    expect(impossibleMachine.reduce(s0, { type: 'run' })).toBe(s0);
    let s = impossibleMachine.reduce(impossibleMachine.reduce(s0, { type: 'pick', item: 0 }), { type: 'slot', index: 0 });
    expect(s.slots[0]).toBe(0);
    s = impossibleMachine.reduce(s, { type: 'slot', index: 0 });
    expect(s.slots[0]).toBeNull();
    expect(s.holding).toBe(0);
    const done = build(s0);
    expect(impossibleMachine.isComplete(done)).toBe(true);
    expect(impossibleMachine.score(done, { moves: 0, hintsUsed: 0 })).toBe(150);
  });

  it('hints name the modules, then slots', () => {
    const s = impossibleMachine.createLevel('tutorial-3', 'advanced').initialState;
    expect(impossibleMachine.hint!(s, 1).text).toMatch(/needs/);
    expect(impossibleMachine.hint!(s, 3).highlightIds).toHaveLength(4);
  });

  it('plays through the runtime', () => {
    const deps = makeDeps();
    let { session } = startSession(impossibleMachine, { seed: 'rt', difficulty: 'expert' }, deps);
    const sol = solveMachine(session.state, session.state.slots.length, 1)[0]!;
    sol.forEach((item, i) => {
      session = submitAction(impossibleMachine, session, { type: 'pick', item }, deps).session;
      session = submitAction(impossibleMachine, session, { type: 'slot', index: i }, deps).session;
    });
    session = submitAction(impossibleMachine, session, { type: 'run' }, deps).session;
    expect(session.status).toBe('succeeded');
  });

  it('renders rhythms, slots and modules', async () => {
    const onAction = jest.fn();
    const { Board } = impossibleMachineUi;
    const s = impossibleMachine.createLevel('tutorial-1', 'intro').initialState;
    await render(<Board state={s} onAction={onAction} highlightIds={[]} disabled={false} />);
    expect(screen.getByLabelText(/^Input: 1 /)).toBeTruthy();
    await fireEvent.press(screen.getByTestId('module-0'));
    expect(onAction).toHaveBeenCalledWith({ type: 'pick', item: 0 });
  });
});

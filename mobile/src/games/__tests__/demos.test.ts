import { registerAllGames } from '..';
import { DEMOS } from '../demos';
import { games, isPlayable } from '../catalogue';
import { getGameModule } from '../registry';

jest.setTimeout(120_000);
registerAllGames();

describe('how-to-play demos', () => {
  it('exist for every playable game', () => {
    for (const g of games) if (isPlayable(g.id)) expect({ id: g.id, demo: !!DEMOS[g.id] }).toEqual({ id: g.id, demo: true });
  });

  it.each(Object.keys(DEMOS))('%s plays its tutorial to the end', (id) => {
    const module = getGameModule(id)!;
    const d = DEMOS[id]!;
    let s = module.createLevel(d.seed, d.difficulty).initialState;
    for (let i = 0; i < 300 && !module.isComplete(s); i += 1) {
      const step = d.next(s);
      if (!step) break;
      expect(step.caption.length).toBeGreaterThan(5);
      if (step.action) s = module.reduce(s, step.action);
      // Stand in for the board's own timers (timed shows end with "shown").
      else if (step.until && !step.until(s)) s = module.reduce(s, { type: 'shown' });
    }
    expect(module.isComplete(s)).toBe(true);
  });
});

import type { GameModule } from '../../game-runtime/contracts';
import { gameRegistry, registerGame } from '../registry';

function stubGame(id: string): GameModule<number, number> {
  return {
    id,
    version: '0.0.1',
    createLevel: (seed, difficulty) => ({
      gameId: id,
      levelId: `${id}:${seed}`,
      generatorVersion: '0.0.1',
      seed,
      difficulty,
      initialState: 0,
      metadata: {},
    }),
    reduce: (state, action) => state + action,
    validateLevel: () => ({ valid: true }),
    isComplete: (state) => state >= 1,
    score: (state) => state,
  };
}

describe('gameRegistry', () => {
  beforeEach(() => gameRegistry.clear());

  it('registers a game module by id', () => {
    registerGame(stubGame('stub-a'));
    expect(gameRegistry.get('stub-a')?.version).toBe('0.0.1');
  });

  it('rejects duplicate ids', () => {
    registerGame(stubGame('stub-a'));
    expect(() => registerGame(stubGame('stub-a'))).toThrow('Duplicate game id: stub-a');
  });
});

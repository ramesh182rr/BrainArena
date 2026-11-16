import { makeCounterGame } from '../../game-runtime/__tests__/testGame';
import { gameRegistry, getGameModule, registerGame } from '../registry';

describe('gameRegistry', () => {
  beforeEach(() => gameRegistry.clear());

  it('registers a game module by id', () => {
    registerGame(makeCounterGame());
    expect(getGameModule('TEST-COUNTER')?.version).toBe('1.0.0');
  });

  it('rejects duplicate ids', () => {
    registerGame(makeCounterGame());
    expect(() => registerGame(makeCounterGame())).toThrow('Duplicate game id: TEST-COUNTER');
  });

  it('returns undefined for unknown ids', () => {
    expect(getGameModule('nope')).toBeUndefined();
  });
});

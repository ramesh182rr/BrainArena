import type { GameModule } from '../game-runtime/contracts';

// Register only fully implemented and tested modules.
// Do not mark catalogue entries playable until their module passes acceptance checks.
export const gameRegistry = new Map<string, GameModule>();

export function registerGame<TState, TAction>(game: GameModule<TState, TAction>): void {
  if (gameRegistry.has(game.id)) throw new Error(`Duplicate game id: ${game.id}`);
  gameRegistry.set(game.id, game as GameModule);
}

export function getGameModule(id: string): GameModule | undefined {
  return gameRegistry.get(id);
}

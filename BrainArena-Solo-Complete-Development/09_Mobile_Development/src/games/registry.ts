import type { GameModule } from "../game-runtime/contracts";

// Register only fully implemented and QA-approved modules.
// Do not mark catalogue entries playable until their module passes acceptance checks.
export const gameRegistry = new Map<string, GameModule>();

export function registerGame<TState, TAction>(game: GameModule<TState, TAction>) {
  if (gameRegistry.has(game.id)) throw new Error(`Duplicate game id: ${game.id}`);
  gameRegistry.set(game.id, game as GameModule);
}

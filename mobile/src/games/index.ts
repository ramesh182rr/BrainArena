import { arrowEscape } from './spatial-dimension/arrow-escape';
import { arrowEscapeUi } from './spatial-dimension/arrow-escape/ui';
import { gameRegistry, registerGame } from './registry';
import { registerGameUi } from './ui';

/**
 * Registers every implemented game. A game appears as playable in the catalogue
 * only after it is added here, together with its UI. Safe to call repeatedly.
 */
export function registerAllGames(): void {
  if (!gameRegistry.has(arrowEscape.id)) registerGame(arrowEscape);
  registerGameUi(arrowEscapeUi);
}

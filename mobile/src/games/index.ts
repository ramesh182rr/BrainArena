import { voltCourier } from './spatial-dimension/volt-courier';
import { voltCourierUi } from './spatial-dimension/volt-courier/ui';
import { numberMaze } from './logic-kingdom/number-maze';
import { numberMazeUi } from './logic-kingdom/number-maze/ui';
import { gameRegistry, registerGame } from './registry';
import { ruleBreaker } from './tricksters-lab/rule-breaker';
import { ruleBreakerUi } from './tricksters-lab/rule-breaker/ui';
import { registerGameUi } from './ui';

/**
 * Registers every implemented game. A game appears as playable in the catalogue
 * only after it is added here, together with its UI. Safe to call repeatedly.
 */
export function registerAllGames(): void {
  if (!gameRegistry.has(voltCourier.id)) registerGame(voltCourier);
  registerGameUi(voltCourierUi);
  if (!gameRegistry.has(numberMaze.id)) registerGame(numberMaze);
  registerGameUi(numberMazeUi);
  if (!gameRegistry.has(ruleBreaker.id)) registerGame(ruleBreaker);
  registerGameUi(ruleBreakerUi);
}

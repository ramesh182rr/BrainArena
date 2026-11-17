import { voltCourier } from './spatial-dimension/volt-courier';
import { voltCourierUi } from './spatial-dimension/volt-courier/ui';
import { numberMaze } from './logic-kingdom/number-maze';
import { numberMazeUi } from './logic-kingdom/number-maze/ui';
import { colourCascade } from './pattern-universe/colour-cascade';
import { colourCascadeUi } from './pattern-universe/colour-cascade/ui';
import { sequenceRecall } from './memory-vault/sequence-recall';
import { sequenceRecallUi } from './memory-vault/sequence-recall/ui';
import { switchChallenge } from './creative-chaos/switch-challenge';
import { switchChallengeUi } from './creative-chaos/switch-challenge/ui';
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
  if (!gameRegistry.has(colourCascade.id)) registerGame(colourCascade);
  registerGameUi(colourCascadeUi);
  if (!gameRegistry.has(sequenceRecall.id)) registerGame(sequenceRecall);
  registerGameUi(sequenceRecallUi);
  if (!gameRegistry.has(switchChallenge.id)) registerGame(switchChallenge);
  registerGameUi(switchChallengeUi);
}

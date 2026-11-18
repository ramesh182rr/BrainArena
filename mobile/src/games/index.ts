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
import { sequenceMaster } from './logic-kingdom/sequence-master';
import { sequenceMasterUi } from './logic-kingdom/sequence-master/ui/SequenceMasterBoard';
import { meowGrid } from './logic-kingdom/meow-grid';
import { meowGridUi } from './logic-kingdom/meow-grid/board';
import { mirrorWorld } from './spatial-dimension/mirror-world';
import { mirrorWorldUi } from './spatial-dimension/mirror-world/board';
import { shapeShift } from './spatial-dimension/shape-shift';
import { shapeShiftUi } from './spatial-dimension/shape-shift/board';
import { chainReaction } from './pattern-universe/chain-reaction';
import { chainReactionUi } from './pattern-universe/chain-reaction/board';
import { whatsChanged } from './memory-vault/whats-changed';
import { whatsChangedUi } from './memory-vault/whats-changed/board';
import { snapshotMemory } from './memory-vault/snapshot-memory';
import { snapshotMemoryUi } from './memory-vault/snapshot-memory/board';
import { gravityLab } from './creative-chaos/gravity-lab';
import { gravityLabUi } from './creative-chaos/gravity-lab/board';
import { missingClue } from './tricksters-lab/missing-clue';
import { missingClueUi } from './tricksters-lab/missing-clue/board';
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
  if (!gameRegistry.has(sequenceMaster.id)) registerGame(sequenceMaster);
  registerGameUi(sequenceMasterUi);
  if (!gameRegistry.has(meowGrid.id)) registerGame(meowGrid);
  registerGameUi(meowGridUi);
  if (!gameRegistry.has(mirrorWorld.id)) registerGame(mirrorWorld);
  registerGameUi(mirrorWorldUi);
  if (!gameRegistry.has(shapeShift.id)) registerGame(shapeShift);
  registerGameUi(shapeShiftUi);
  if (!gameRegistry.has(chainReaction.id)) registerGame(chainReaction);
  registerGameUi(chainReactionUi);
  if (!gameRegistry.has(whatsChanged.id)) registerGame(whatsChanged);
  registerGameUi(whatsChangedUi);
  if (!gameRegistry.has(snapshotMemory.id)) registerGame(snapshotMemory);
  registerGameUi(snapshotMemoryUi);
  if (!gameRegistry.has(gravityLab.id)) registerGame(gravityLab);
  registerGameUi(gravityLabUi);
  if (!gameRegistry.has(missingClue.id)) registerGame(missingClue);
  registerGameUi(missingClueUi);
}

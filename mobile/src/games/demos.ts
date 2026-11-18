/**
 * Animated "how to play" demos: one small script per game.
 *
 * Each script looks at the current board and returns the next demo step: an
 * action to perform (with the squares to highlight and a caption saying why),
 * or a wait while the board's own animation or timed show plays. The demo
 * player runs the real board with these steps, so what the player sees is
 * exactly how the game behaves. Scripts drive each game's own solver.
 */
import type { DifficultyBand } from '@/game-runtime/contracts';

import { blockEscape, solveEscape, pieceId } from './spatial-dimension/block-escape';
import { cellId as voltCell, solve as solveVolt, voltCourier } from './spatial-dimension/volt-courier';
import { turnsBetween } from './spatial-dimension/volt-courier/grid';
import { numberMaze, roomId, solveMaze } from './logic-kingdom/number-maze';
import { currentExam, passes, ruleBreaker, specimenId } from './tricksters-lab/rule-breaker';
import { colourCascade, plotId as cascadePlot, solveGarden as solveCascade } from './pattern-universe/colour-cascade';
import { currentRound, expectedAnswer, placeId, sequenceRecall, symbolId, usesSymbols } from './memory-vault/sequence-recall';
import { shortestPresses, switchChallenge, switchId } from './creative-chaos/switch-challenge';
import { blankId, sequenceMaster, terms } from './logic-kingdom/sequence-master';
import { arrowId, mirrorWorld, solveMirror } from './spatial-dimension/mirror-world';
import { missingClue, tokenId } from './tricksters-lab/missing-clue';
import { cellId as catCell, meowGrid } from './logic-kingdom/meow-grid';
import { currentCubes, rotationId, shapeShift, solveShape } from './spatial-dimension/shape-shift';
import { chainReaction, nodeId, solveChain, tapsBetween } from './pattern-universe/chain-reaction';
import { gravityLab, solveLab, squareId as labSquare } from './creative-chaos/gravity-lab';
import { changedCells, squareId as changedSquare, whatsChanged } from './memory-vault/whats-changed';
import { snapshotMemory, squareId as snapSquare } from './memory-vault/snapshot-memory';
import { keyId, numberLock, tumblerId } from './logic-kingdom/number-lock';
import { cellId as gridCell, ITEMS, logicGrid, PEOPLE, TIMES } from './logic-kingdom/logic-grid';
import { dotConnect, solveConstellation, starId } from './pattern-universe/dot-connect';
import { patternLink, solveWeave, tileId } from './pattern-universe/pattern-link';
import { pathFinder, plotId as gardenPlot, solveGarden as solvePath } from './spatial-dimension/path-finder';
import { cheapest, limitedMoves, machineId } from './pattern-universe/limited-moves';
import { memoryDetective, squareId as detectiveSquare } from './memory-vault/memory-detective';
import { objectRecall, optionId as recallOption } from './memory-vault/object-recall';
import { impossibleMachine, itemId, slotId, solveMachine } from './creative-chaos/impossible-machine';
import { impossibleAnswer, cardId, pileId, reachable, workingReadings } from './tricksters-lab/impossible-answer';
import { hiddenTruth, statementId } from './tricksters-lab/hidden-truth';
import { pictureRiddle, optionId as riddleOption } from './tricksters-lab/picture-riddle';
import { drawTheSolution, solveDraw, squareId as drawSquare } from './creative-chaos/draw-the-solution';
import { objectIllusion, solveIllusion, thingId } from './creative-chaos/object-illusion';

export interface DemoStep<S = unknown, A = unknown> {
  /** Performed after the highlight has been shown for a moment. */
  action?: A;
  /** When set, the demo waits (without acting) until this returns true. */
  until?: (state: S) => boolean;
  highlightIds?: string[];
  caption: string;
}

export interface GameDemo<S = unknown, A = unknown> {
  /** The level the demo plays (normally the first tutorial). */
  seed: string;
  difficulty: DifficultyBand;
  /** Next step for the current board, or null when the demo is over. */
  next(state: S): DemoStep<S, A> | null;
}

const demo = <S, A>(d: GameDemo<S, A>) => d as unknown as GameDemo;

export const DEMOS: Record<string, GameDemo> = {
  [voltCourier.id]: demo<Parameters<typeof voltCourier.reduce>[0], unknown>({
    seed: 'tutorial-1',
    difficulty: 'intro',
    next(s) {
      const r = solveVolt(s);
      if (r.status !== 'solved') return null;
      const i = r.rotations.findIndex((t, k) => s.cells[k] && turnsBetween(s.cells[k]!, s.rotations[k] ?? 0, t) > 0);
      if (i < 0) return null;
      return { action: { type: 'rotate', index: i }, highlightIds: [voltCell(i)], caption: 'Tap a conduit to turn it. The pulse follows the path you make.' };
    },
  }),
  [numberMaze.id]: demo<Parameters<typeof numberMaze.reduce>[0], unknown>({
    seed: 'tutorial-1',
    difficulty: 'intro',
    next(s) {
      const r = solveMaze(s, s.path, s.values[s.values.length - 1]!);
      if (r.status !== 'solved' || r.path.length <= s.path.length) return null;
      const i = r.path[s.path.length]!;
      return { action: { type: 'move', index: i }, highlightIds: [roomId(i)], caption: 'Step into a neighbouring room. Its gate changes your running number.' };
    },
  }),
  [ruleBreaker.id]: demo<Parameters<typeof ruleBreaker.reduce>[0], unknown>({
    seed: 'tutorial-1',
    difficulty: 'intro',
    next(s) {
      if (s.phase === 'lab') {
        if (s.tested.length < s.par) {
          const i = s.tray.findIndex((_, k) => !s.tested.includes(k));
          return { action: { type: 'test', index: i }, highlightIds: [specimenId(i)], caption: 'Scan a specimen. The lab says PASS or FAIL for the hidden rule.' };
        }
        return { action: { type: 'startExam' }, caption: 'Once the evidence is clear, start the exam.' };
      }
      return { action: { type: 'submitExam', answers: currentExam(s).map((x) => passes(s.rule, x)) }, caption: 'Sort the fresh specimens using the rule you worked out.' };
    },
  }),
  [colourCascade.id]: demo<Parameters<typeof colourCascade.reduce>[0], unknown>({
    seed: 'tutorial-1',
    difficulty: 'intro',
    next(s) {
      const r = solveCascade(s, s.inventory, { maxDrops: 8 });
      const d = r.status === 'solved' ? r.drops[0] : undefined;
      if (!d) return null;
      return { action: { type: 'drop', ...d }, highlightIds: [cascadePlot(d.index)], caption: 'Drop a colour on a pad. It cascades through the plants it can feed.' };
    },
  }),
  [sequenceRecall.id]: demo<Parameters<typeof sequenceRecall.reduce>[0], unknown>({
    seed: 'tutorial-1',
    difficulty: 'intro',
    next(s) {
      if (s.done) return null;
      if (s.phase === 'ready' || s.phase === 'feedback') return { action: { type: 'watch' }, caption: 'Press Watch and remember each item as it lights up.' };
      if (s.phase === 'showing') return { until: (x) => x.phase !== 'showing', caption: 'Watch closely…' };
      const round = currentRound(s)!;
      const v = expectedAnswer(s.sequence, round.channel)[s.answer.length]!;
      return { action: { type: 'input', value: v }, highlightIds: [usesSymbols(round.channel) ? symbolId(v) : placeId(v)], caption: 'Now answer through the channel the round asks for.' };
    },
  }),
  [switchChallenge.id]: demo<Parameters<typeof switchChallenge.reduce>[0], unknown>({
    seed: 'tutorial-1',
    difficulty: 'intro',
    next(s) {
      const p = shortestPresses(s.switches, s.levels, s.dials, s.target, 30);
      if (!p?.length) return null;
      return { action: { type: 'press', index: p[0]! }, highlightIds: [switchId(p[0]!)], caption: 'Press a switch. Its hidden wiring nudges the dials; watch which ones move.' };
    },
  }),
  [sequenceMaster.id]: demo<Parameters<typeof sequenceMaster.reduce>[0], unknown>({
    seed: 'tutorial-1',
    difficulty: 'intro',
    next(s) {
      if (s.done) return null;
      const r = s.rounds[s.round]!;
      const t = terms(r);
      const i = r.blanks.findIndex((b, k) => s.entries[k] !== String(t[b]));
      if (i < 0) return { action: { type: 'check' }, caption: 'All blanks filled: check the answer.' };
      if (s.active !== i) return { action: { type: 'select', blank: i }, highlightIds: [blankId(i)], caption: 'Pick a blank in the sequence.' };
      const want = String(t[r.blanks[i]!]);
      const have = s.entries[i] ?? '';
      if (!want.startsWith(have)) return { action: { type: 'backspace' }, caption: 'Fix the digit.' };
      return { action: { type: 'digit', digit: Number(want[have.length]) }, highlightIds: [blankId(i)], caption: 'Type the number the repeating steps lead to.' };
    },
  }),
  [mirrorWorld.id]: demo<Parameters<typeof mirrorWorld.reduce>[0], unknown>({
    seed: 'tutorial-1',
    difficulty: 'intro',
    next(s) {
      const [a, b] = s.path[s.path.length - 1]!;
      const sol = solveMirror(s, a, b, s.path.length - 1);
      if (!sol?.length) return null;
      return { action: { type: 'move', dir: sol[0]! }, highlightIds: [arrowId(sol[0]!)], caption: 'One arrow moves both explorers. The right one gets a transformed move.' };
    },
  }),
  [missingClue.id]: demo<Parameters<typeof missingClue.reduce>[0], unknown>({
    seed: 'tutorial-1',
    difficulty: 'intro',
    next(s) {
      const k = s.slots.findIndex((x) => x === null);
      if (k < 0) return null;
      const e = s.truth[k]!;
      return { action: { type: 'place', event: e }, highlightIds: [tokenId(e)], caption: 'Place events on the timeline. Clue cards light up as they are satisfied.' };
    },
  }),
  [meowGrid.id]: demo<Parameters<typeof meowGrid.reduce>[0], unknown>({
    seed: 'tutorial-1',
    difficulty: 'intro',
    next(s) {
      const i = s.cells.findIndex((v) => v === null);
      if (i < 0) return null;
      if (s.selected !== i) return { action: { type: 'select', cell: i }, highlightIds: [catCell(i)], caption: 'Pick an empty square.' };
      return { action: { type: 'place', cat: s.solution[i]! }, highlightIds: [catCell(i)], caption: 'Each row, column and region holds every cat once.' };
    },
  }),
  [shapeShift.id]: demo<Parameters<typeof shapeShift.reduce>[0], unknown>({
    seed: 'tutorial-1',
    difficulty: 'intro',
    next(s) {
      const sol = solveShape(s, currentCubes(s));
      if (!sol?.length) return null;
      return { action: { type: 'rotate', rotation: sol[0]! }, highlightIds: [rotationId(sol[0]!)], caption: 'Turn the shape until its shadow matches the target outline.' };
    },
  }),
  [chainReaction.id]: demo<Parameters<typeof chainReaction.reduce>[0], unknown>({
    seed: 'tutorial-1',
    difficulty: 'intro',
    next(s) {
      if (s.lastRun?.success) return null;
      const best = solveChain(s);
      if (!best) return null;
      const i = s.nodes.findIndex((n, k) => tapsBetween(n, s.orient[k]!, best.orient[k]!) > 0);
      if (i >= 0) return { action: { type: 'rotate', cell: i }, highlightIds: [nodeId(i)], caption: 'Turn relays so the pulse heads for every star.' };
      return { action: { type: 'fire' }, until: (x) => !!x.lastRun, caption: 'Fire! Each relay re-fires one tick after a pulse reaches it.' };
    },
  }),
  [gravityLab.id]: demo<Parameters<typeof gravityLab.reduce>[0], unknown>({
    seed: 'tutorial-1',
    difficulty: 'intro',
    next(s) {
      if (s.lastRun?.outcome === 'exit') return null;
      const sol = solveLab(s);
      if (!sol) return null;
      const i = sol.findIndex((k, cell) => k !== (s.placed[cell] ?? null));
      if (i >= 0) return { action: { type: 'cycle', cell: i }, highlightIds: [labSquare(i)], caption: 'Place a device beside the orb’s path: it swings the orb round as it passes.' };
      return { action: { type: 'launch' }, caption: 'Launch the orb and watch it bend towards the exit.' };
    },
  }),
  [whatsChanged.id]: demo<Parameters<typeof whatsChanged.reduce>[0], unknown>({
    seed: 'tutorial-1',
    difficulty: 'intro',
    next(s) {
      if (s.done) return null;
      if (s.phase === 'ready' || s.phase === 'feedback') return { action: { type: 'watch' }, caption: 'Study the scene: remember each shape and colour.' };
      if (s.phase === 'study') return { action: { type: 'studied' }, caption: 'When you are ready, the scene comes back with something changed.' };
      const missing = changedCells(s.changes).filter((c) => !s.marks.includes(c));
      if (missing.length) return { action: { type: 'toggle', cell: missing[0]! }, highlightIds: [changedSquare(missing[0]!)], caption: 'Tap every square that is different.' };
      return { action: { type: 'check' }, caption: 'Check your marks.' };
    },
  }),
  [snapshotMemory.id]: demo<Parameters<typeof snapshotMemory.reduce>[0], unknown>({
    seed: 'tutorial-1',
    difficulty: 'intro',
    next(s) {
      if (s.done) return null;
      if (s.phase === 'ready' || s.phase === 'feedback') return { action: { type: 'watch' }, caption: 'A small window sweeps across the room. The mini-map shows where it is.' };
      if (s.phase === 'show') return { until: (x) => x.phase !== 'show', caption: 'Remember where each object sits…' };
      const i = s.placed.findIndex((p) => p === null);
      if (i < 0) return { action: { type: 'check' }, caption: 'Check the map.' };
      if (s.selected !== i) return { action: { type: 'select', item: i }, caption: 'Pick an object from the tray.' };
      return { action: { type: 'place', cell: s.items[i]!.cell }, highlightIds: [snapSquare(s.items[i]!.cell)], caption: 'Tap where it was on the blank room map.' };
    },
  }),
  [numberLock.id]: demo<Parameters<typeof numberLock.reduce>[0], unknown>({
    seed: 'tutorial-1',
    difficulty: 'intro',
    next(s) {
      if (s.solved) return null;
      // First try a spread of digits, then the code (a demo shortcut).
      const guess = s.attempts.length === 0 ? s.secret.map((_, i) => Math.min(s.maxDigit, 1 + i * 2)) : s.secret;
      const i = guess.findIndex((d, k) => s.entry[k] !== d);
      if (i < 0) return { action: { type: 'submit' }, caption: s.attempts.length ? 'Try the code the signals point to.' : 'Try a code. Each tumbler lights: ● exact, ◐ one away, ○ further.' };
      if (s.cursor !== i) return { action: { type: 'select', index: i }, highlightIds: [tumblerId(i)], caption: 'Pick a tumbler.' };
      return { action: { type: 'digit', value: guess[i]! }, highlightIds: [keyId(guess[i]!)], caption: 'Set its digit.' };
    },
  }),
  [logicGrid.id]: demo<Parameters<typeof logicGrid.reduce>[0], unknown>({
    seed: 'tutorial-1',
    difficulty: 'intro',
    next(s) {
      for (let p = 0; p < s.n; p += 1) {
        for (const col of s.useTimes ? (['item', 'time'] as const) : (['item'] as const)) {
          const want = s.solution[col][p]!;
          if (s[col][p] === want) continue;
          if (s.selected?.p !== p || s.selected.col !== col) return { action: { type: 'select', p, col }, highlightIds: [gridCell(p, col)], caption: `Pick ${PEOPLE[p]}'s ${col === 'item' ? 'item' : 'time'}.` };
          return { action: { type: 'set', value: want }, highlightIds: [gridCell(p, col)], caption: `The clues point to ${col === 'item' ? `the ${ITEMS[want]}` : TIMES[want]}. Clues tick green when satisfied.` };
        }
      }
      return null;
    },
  }),
  [blockEscape.id]: demo<Parameters<typeof blockEscape.reduce>[0], unknown>({
    seed: 'tutorial-1',
    difficulty: 'intro',
    next(s) {
      const sol = solveEscape(s, s);
      const m = sol?.[0];
      if (!m) return null;
      if (!s.selected || pieceId(s.selected) !== pieceId(m.piece)) return { action: { type: 'select', piece: m.piece }, highlightIds: [pieceId(m.piece)], caption: m.piece.kind === 'crate' ? 'Pick a crate.' : 'Pick a platform: it carries any crate riding on it.' };
      return { action: { type: 'move', dir: m.dir }, highlightIds: [pieceId(m.piece)], caption: 'Move it. Crates cannot cross the pit on foot, so ferry the gold one over.' };
    },
  }),
  [dotConnect.id]: demo<Parameters<typeof dotConnect.reduce>[0], unknown>({
    seed: 'tutorial-1',
    difficulty: 'intro',
    next(s) {
      const sol = solveConstellation(s, 1, s.route).first;
      if (!sol || sol.length <= s.route.length) return null;
      const n = sol[s.route.length]!;
      return { action: { type: 'tap', star: n }, highlightIds: [starId(n)], caption: 'Tap the next star along a link. Light every star, ending at the beacon.' };
    },
  }),
  [patternLink.id]: demo<Parameters<typeof patternLink.reduce>[0], unknown>({
    seed: 'tutorial-1',
    difficulty: 'intro',
    next(s) {
      const sol = solveWeave(s, s.path);
      if (!sol || sol.length <= s.path.length) return null;
      const c = sol[s.path.length]!;
      return { action: { type: 'step', cell: c }, highlightIds: [tileId(c)], caption: 'Step to a neighbouring tile whose motif may follow the current one.' };
    },
  }),
  [pathFinder.id]: demo<Parameters<typeof pathFinder.reduce>[0], unknown>({
    seed: 'tutorial-1',
    difficulty: 'intro',
    next(s) {
      const sol = solvePath(s, s.ground, s.at);
      if (!sol?.length) return null;
      return { action: { type: 'step', cell: sol[0]! }, highlightIds: [gardenPlot(sol[0]!)], caption: 'Step onto a square. The hedges next to it flip up or down.' };
    },
  }),
  [limitedMoves.id]: demo<Parameters<typeof limitedMoves.reduce>[0], unknown>({
    seed: 'tutorial-1',
    difficulty: 'intro',
    next(s) {
      const plan = cheapest(s, s.running);
      const i = plan?.order[0];
      if (i === undefined) return null;
      return { action: { type: 'start', machine: i }, highlightIds: [machineId(i)], caption: s.machines[i]!.kind === 'gear' ? 'Start a gear first: it makes linked machines cheaper.' : 'Start the next machine while energy lasts.' };
    },
  }),
  [memoryDetective.id]: demo<Parameters<typeof memoryDetective.reduce>[0], unknown>({
    seed: 'tutorial-1',
    difficulty: 'intro',
    next(s) {
      if (s.done) return null;
      if (s.phase === 'ready' || s.phase === 'feedback') return { action: { type: 'watch' }, caption: 'Study the room: notice what is left, right, above and below what.' };
      if (s.phase === 'study') return { action: { type: 'studied' }, caption: 'Then rebuild it on a blank map.' };
      const i = s.placed.findIndex((p) => p === null);
      if (i < 0) return { action: { type: 'check' }, caption: 'Only the arrangement counts. Check it.' };
      const it = s.items[i]!;
      const cell = Math.floor(it.cell / s.sceneSize) * s.mapSize + (it.cell % s.sceneSize) + 1;
      if (s.selected !== i) return { action: { type: 'select', item: i }, caption: 'Pick an object.' };
      return { action: { type: 'place', cell }, highlightIds: [detectiveSquare(cell)], caption: 'Place it. Shifting the whole room is fine.' };
    },
  }),
  [objectRecall.id]: demo<Parameters<typeof objectRecall.reduce>[0], unknown>({
    seed: 'tutorial-1',
    difficulty: 'intro',
    next(s) {
      if (s.done) return null;
      if (s.phase === 'ready' || s.phase === 'feedback') return { action: { type: 'begin' }, caption: 'Read a little story, one card at a time.' };
      if (s.phase === 'story') return { action: { type: 'next' }, caption: 'Picture who did what, and where.' };
      if (s.phase === 'break') return { action: { type: 'breakTap', side: s.breakTask[s.breakIndex]![0] > s.breakTask[s.breakIndex]![1] ? 0 : 1 }, caption: 'A quick break: tap the bigger number.' };
      const q = s.questions[s.answers.length]!;
      return { action: { type: 'answer', option: q.answer }, highlightIds: [recallOption(q.options.indexOf(q.answer))], caption: 'Answer from memory.' };
    },
  }),
  [impossibleMachine.id]: demo<Parameters<typeof impossibleMachine.reduce>[0], unknown>({
    seed: 'tutorial-1',
    difficulty: 'intro',
    next(s) {
      if (s.solved) return null;
      const sol = solveMachine(s, s.slots.length, 1)[0];
      if (!sol) return null;
      const k = s.slots.findIndex((x, i) => x !== sol[i]);
      if (k < 0) return { action: { type: 'run' }, caption: 'Run the machine: the output should match the target rhythm.' };
      if (s.holding !== sol[k]) return { action: { type: 'pick', item: sol[k]! }, highlightIds: [itemId(sol[k]!)], caption: 'Pick a module. The legend says how it reshapes the rhythm.' };
      return { action: { type: 'slot', index: k }, highlightIds: [slotId(k)], caption: 'Drop it into a slot.' };
    },
  }),
  [impossibleAnswer.id]: demo<Parameters<typeof impossibleAnswer.reduce>[0], unknown>({
    seed: 'tutorial-1',
    difficulty: 'intro',
    next(s) {
      if (s.solved) return null;
      const mask = workingReadings(s)[0]!;
      const flip = s.cards.findIndex((_, i) => ((mask >> i) & 1) === 1 !== s.flipped[i]);
      if (flip >= 0 && !s.locked) return { action: { type: 'flip', card: flip }, highlightIds: [cardId(flip)], caption: 'Read literally, the goal is impossible. Flip the card to read it another way.' };
      const plan = reachable(s.piles, s.cards.map((c, i) => (s.flipped[i] ? c.b : c.a)), s.goal, s.maxMoves - s.moves.length);
      const m = plan?.[0];
      if (!m) return null;
      return { action: { type: 'use', card: m.card, pile: m.pile }, highlightIds: [cardId(m.card), pileId(m.pile)], caption: 'Now use the card on a pile.' };
    },
  }),
  [hiddenTruth.id]: demo<Parameters<typeof hiddenTruth.reduce>[0], unknown>({
    seed: 'tutorial-1',
    difficulty: 'intro',
    next(s) {
      if (s.solved) return null;
      if (s.view === 0 && !s.crossed.some(Boolean)) return { action: { type: 'turn', dir: 1 }, caption: 'Walk round the table. "Left of" and "in front of" change as you move.' };
      const decoy = s.statements.findIndex((_, i) => i !== s.answer && !s.crossed[i]);
      if (decoy >= 0) return { action: { type: 'cross', statement: decoy }, highlightIds: [statementId(decoy)], caption: 'Cross out statements that fail from some side.' };
      return { action: { type: 'pick', statement: s.answer }, highlightIds: [statementId(s.answer)], caption: 'The one left standing is true from every side.' };
    },
  }),
  [pictureRiddle.id]: demo<Parameters<typeof pictureRiddle.reduce>[0], unknown>({
    seed: 'tutorial-1',
    difficulty: 'intro',
    next(s) {
      if (s.solved) return null;
      return { action: { type: 'pick', option: s.answer }, highlightIds: [riddleOption(s.answer)], caption: 'Spot what changes in the example, then make the same change to the new card.' };
    },
  }),
  [drawTheSolution.id]: demo<Parameters<typeof drawTheSolution.reduce>[0], unknown>({
    seed: 'tutorial-1',
    difficulty: 'intro',
    next(s) {
      if (s.lastRun?.outcome === 'basket') return null;
      const sol = solveDraw(s);
      if (!sol) return null;
      if (s.material !== sol.material) return { action: { type: 'material', material: sol.material }, caption: 'Pick a material.' };
      const k = sol.stroke.findIndex((c, i) => s.stroke[i] !== c);
      if (k >= 0 && s.stroke.length === k) return { action: { type: 'draw', cell: sol.stroke[k]! }, highlightIds: [drawSquare(sol.stroke[k]!)], caption: 'Draw from the anchor peg, one square at a time.' };
      if (k >= 0) return { action: { type: 'clear' }, caption: 'Start the stroke again.' };
      return { action: { type: 'drop' }, until: (x) => !!x.lastRun, caption: 'Drop the ball and watch it roll along your stroke.' };
    },
  }),
  [objectIllusion.id]: demo<Parameters<typeof objectIllusion.reduce>[0], unknown>({
    seed: 'tutorial-1',
    difficulty: 'intro',
    next(s) {
      const sol = solveIllusion(s.things, s.goals, s.allowMove);
      const ch = sol?.[0];
      if (!ch) return null;
      return { action: { type: 'change', change: ch }, highlightIds: [thingId(ch.obj)], caption: 'Change one thing about an object at a time until every goal is met.' };
    },
  }),
};

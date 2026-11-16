import type { WorldId } from '@/design-system/tokens';

import { gameRegistry } from './registry';

/**
 * Catalogue metadata for all six worlds and 30 game concepts (PRD FR-010/011).
 * Source: 03_Game_Design_Documents/Game_Catalogue.md and the per-game GDDs.
 *
 * A catalogue entry is only a description. A game becomes playable when its
 * module is registered in `registry.ts`; nothing here can mark a game as done.
 *
 * Copy is English-only for now and kept out of components so it can move to a
 * localisation bundle without touching screens.
 */

export type GeneratorType = 'procedural' | 'authored' | 'hybrid';
export type Orientation = 'portrait' | 'landscape';

export interface WorldEntry {
  id: WorldId;
  slug: string;
  title: string;
  tagline: string;
  sortOrder: number;
}

export interface GameEntry {
  /** GDD id, e.g. `W3-G01`. Also the id of the game's module. */
  id: string;
  worldId: WorldId;
  slug: string;
  title: string;
  /** Short name of the core mechanic. */
  mechanic: string;
  summary: string;
  /** What the game exercises, in recreational (non-clinical) wording. */
  primarySignal: string;
  generatorType: GeneratorType;
  orientation: Orientation;
  offline: boolean;
}

export const worlds: readonly WorldEntry[] = [
  { id: 'W1', slug: 'tricksters-lab', title: "Trickster's Lab", tagline: 'Lateral thinking and unconventional problem-solving', sortOrder: 1 },
  { id: 'W2', slug: 'logic-kingdom', title: 'Logic Kingdom', tagline: 'Deduction, number logic and structured reasoning', sortOrder: 2 },
  { id: 'W3', slug: 'spatial-dimension', title: 'Spatial Dimension', tagline: 'Spatial reasoning, orientation and movement planning', sortOrder: 3 },
  { id: 'W4', slug: 'pattern-universe', title: 'Pattern Universe', tagline: 'Pattern recognition, matching and strategic connections', sortOrder: 4 },
  { id: 'W5', slug: 'memory-vault', title: 'Memory Vault', tagline: 'Visual memory, observation and recall', sortOrder: 5 },
  { id: 'W6', slug: 'creative-chaos', title: 'Creative Chaos', tagline: 'Creative reasoning, experimentation and interactive problem-solving', sortOrder: 6 },
];

function game(
  id: string,
  slug: string,
  title: string,
  mechanic: string,
  summary: string,
  primarySignal: string,
  generatorType: GeneratorType,
): GameEntry {
  return {
    id,
    worldId: id.slice(0, 2) as WorldId,
    slug,
    title,
    mechanic,
    summary,
    primarySignal,
    generatorType,
    orientation: 'portrait',
    offline: true,
  };
}

export const games: readonly GameEntry[] = [
  // W1 — Trickster's Lab
  game('W1-G01', 'the-missing-clue', 'The Missing Clue', 'Evidence reconstruction', 'Inspect a small scene and place evidence tokens into a causal chain; one clue changes meaning in a different context.', 'Story and logic', 'authored'),
  game('W1-G02', 'impossible-answer', 'Impossible Answer', 'Constraint reframing', 'A prompt presents a misleading goal; rearrange rule cards to reveal a valid alternate interpretation.', 'Lateral reasoning', 'authored'),
  game('W1-G03', 'hidden-truth', 'Hidden Truth', 'Perspective switching', 'Rotate a viewpoint lens over an illustrated scene and find the statement that stays consistent from every perspective.', 'Inference', 'hybrid'),
  game('W1-G04', 'picture-riddle', 'Picture Riddle', 'Visual relationship mapping', 'Connect visual fragments by meaning, then test the relationship by revealing a transformation result.', 'Visual reasoning', 'hybrid'),
  game('W1-G05', 'rule-breaker', 'Rule Breaker', 'Rule discovery', 'Arrange experiments to test objects against a hidden rule; feedback shows which property caused a pass or fail.', 'Hypothesis testing', 'procedural'),
  // W2 — Logic Kingdom
  game('W2-G01', 'meow-grid', 'Meow Grid', 'Symbol constraint lattice', 'Place themed tokens on a multi-region board with row, column and region rules; echo cells carry a clue across regions.', 'Deduction', 'hybrid'),
  game('W2-G02', 'number-maze', 'Number Maze', 'Arithmetic route planning', 'Choose a route through gates that transform a running value; reach the target without breaking the bounds.', 'Numerical reasoning', 'procedural'),
  game('W2-G03', 'sequence-master', 'Sequence Master', 'Rule composition', 'Complete sequences where each step applies two alternating transformations, with a rule-history strip to inspect.', 'Pattern logic', 'procedural'),
  game('W2-G04', 'logic-grid', 'Logic Grid', 'Multi-attribute deduction', 'Match characters, objects and time slots using clue tiles; a detector highlights the smallest conflicting clue set.', 'Deduction', 'hybrid'),
  game('W2-G05', 'number-lock', 'Number Lock', 'Code inference', 'Crack a lock by proposing short number strings; a distinct signal system marks position and value constraints.', 'Deductive inference', 'procedural'),
  // W3 — Spatial Dimension
  game('W3-G01', 'arrow-escape', 'Arrow Escape', 'Energy-current routing', 'Rotate junctions to redirect moving energy pulses through a network so each pulse reaches its matching receiver.', 'Spatial planning', 'hybrid'),
  game('W3-G02', 'block-escape', 'Block Escape', 'Layered cargo choreography', 'Slide modular cargo platforms across a warehouse board; some platforms carry smaller pieces, changing which moves are legal.', 'Spatial planning', 'procedural'),
  game('W3-G03', 'path-finder', 'Path Finder', 'Living path construction', 'Draw a route through a shifting garden where each step changes nearby terrain.', 'Path planning', 'hybrid'),
  game('W3-G04', 'shape-shift', 'Shape Shift', 'Projection assembly', 'Rotate silhouettes and arrange flat facets so their combined shadow matches a target outline.', 'Mental rotation', 'hybrid'),
  game('W3-G05', 'mirror-world', 'Mirror World', 'Dual-board coordination', 'Guide two linked explorers through mirrored rooms; a move in one room causes a different change in the other.', 'Spatial transformation', 'hybrid'),
  // W4 — Pattern Universe
  game('W4-G01', 'dot-connect', 'Dot Connect', 'Signal constellation', 'Connect nodes to route a signal through a graph under colour and degree rules; crossings can alter the signal phase.', 'Graph reasoning', 'procedural'),
  game('W4-G02', 'colour-cascade', 'Colour Cascade', 'Colour ecology', 'Drop colour droplets into a layered garden; neighbouring plants transform by a local rule table until the board is stable.', 'Pattern and strategy', 'procedural'),
  game('W4-G03', 'pattern-link', 'Pattern Link', 'Motif weaving', 'Trace a path through motif tiles; each tile changes which motif may come next, forming a grammar to infer.', 'Pattern recognition', 'procedural'),
  game('W4-G04', 'limited-moves', 'Limited Moves', 'Resource choreography', 'Activate a board of mechanisms with a fixed number of actions; the order changes later costs and available moves.', 'Planning', 'hybrid'),
  game('W4-G05', 'chain-reaction', 'Chain Reaction', 'Pulse timing', 'Trigger one node; pulses travel with delays and amplify, dampen or redirect at junctions to reach a target state.', 'Causal reasoning', 'procedural'),
  // W5 — Memory Vault
  game('W5-G01', 'memory-detective', 'Memory Detective', 'Scene reconstruction', 'Study a lively scene briefly, then rebuild how its objects relate on a blank scene map.', 'Visual memory', 'hybrid'),
  game('W5-G02', 'object-recall', 'Object Recall', 'Contextual recall', 'Observe objects in small stories, then answer questions about location, relation and order after a distraction task.', 'Recall in context', 'hybrid'),
  game('W5-G03', 'whats-changed', "What's Changed?", 'Temporal difference tracking', 'Watch a scene evolve through subtle changes, then select the changes in the order they happened.', 'Observation', 'procedural'),
  game('W5-G04', 'sequence-recall', 'Sequence Recall', 'Multi-channel sequence', 'Remember a sequence of symbols, tones and positions, then reproduce it through a different input channel.', 'Working memory', 'procedural'),
  game('W5-G05', 'snapshot-memory', 'Snapshot Memory', 'Spatial snapshot', 'A camera view sweeps across a room; later place landmarks and objects on a coarse map.', 'Spatial memory', 'procedural'),
  // W6 — Creative Chaos
  game('W6-G01', 'gravity-lab', 'Gravity Lab', 'Force-field tinkering', 'Place a limited set of attractor and repulsor devices to guide a drifting object through gates.', 'Creative and spatial', 'hybrid'),
  game('W6-G02', 'draw-the-solution', 'Draw the Solution', 'Stroke engineering', 'Draw one continuous elastic bridge or brace that redirects a moving object; materials flex and anchor differently.', 'Creative problem solving', 'authored'),
  game('W6-G03', 'object-illusion', 'Object Illusion', 'Property transformation', 'Combine objects by changing one property at a time, such as weight or warmth, to satisfy a scene objective.', 'Analogical reasoning', 'authored'),
  game('W6-G04', 'switch-challenge', 'Switch Challenge', 'State-machine puzzle', 'Operate switches that change several linked devices and reach a target configuration with limited toggles.', 'Systems reasoning', 'procedural'),
  game('W6-G05', 'impossible-machine', 'Impossible Machine', 'Causal machine repair', 'Inspect a whimsical machine and place modules so its output matches a target rhythm and flow.', 'Causal reasoning', 'authored'),
];

export function getWorld(id: WorldId): WorldEntry {
  const world = worlds.find((w) => w.id === id);
  if (!world) throw new Error(`Unknown world: ${id}`);
  return world;
}

export function getGame(id: string): GameEntry | undefined {
  return games.find((g) => g.id === id);
}

export function gamesInWorld(worldId: WorldId): readonly GameEntry[] {
  return games.filter((g) => g.worldId === worldId);
}

/** True only when an implemented module is registered for the game. */
export function isPlayable(gameId: string): boolean {
  return gameRegistry.has(gameId);
}

export function playableCount(worldId?: WorldId): number {
  return games.filter((g) => (worldId ? g.worldId === worldId : true) && isPlayable(g.id)).length;
}

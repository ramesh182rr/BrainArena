/**
 * Common game contract. Every game is an independent module that implements
 * `GameModule` with pure, deterministic functions: no React, storage, network,
 * clock or `Math.random` access. The runtime (`session.ts`) owns lifecycle,
 * counters, timing and events.
 */

export const DIFFICULTY_BANDS = ['intro', 'easy', 'standard', 'advanced', 'expert'] as const;
export type DifficultyBand = (typeof DIFFICULTY_BANDS)[number];

export type GameStatus =
  | 'loading'
  | 'ready'
  | 'playing'
  | 'paused'
  | 'succeeded'
  | 'failed'
  | 'summary'
  | 'exited';

/** Where a level came from. `fallback` means generation failed validation (FR-026). */
export type LevelSource = 'generated' | 'authored' | 'fallback';

export interface PuzzleLevel<TState = unknown> {
  gameId: string;
  levelId: string;
  generatorVersion: string;
  seed: string;
  difficulty: DifficultyBand;
  source: LevelSource;
  /** Stable hash of the puzzle structure, used for novelty checks (FR-027). */
  fingerprint: string;
  /** Must be JSON-serialisable so sessions can be persisted and resumed. */
  initialState: TState;
  metadata: Record<string, string | number | boolean>;
}

export interface ValidationResult {
  valid: boolean;
  /** Stable machine-readable reason when `valid` is false. */
  reasonCode?: string;
  /** Hash of a known solution, as a validator certificate for QA (FR-023). */
  solutionFingerprint?: string;
}

export type HintTier = 1 | 2 | 3;

export interface GameHint {
  tier: HintTier;
  text: string;
  /** Ids of board elements the UI should emphasise. */
  highlightIds: readonly string[];
}

export interface ScoreContext {
  moves: number;
  hintsUsed: number;
}

export interface GameModule<TState = unknown, TAction = unknown> {
  /** Catalogue id, e.g. `W3-G01`. */
  id: string;
  /** Generator and rules version. Bump when the same seed would yield a different level. */
  version: string;
  /** Deterministic for a given (id, version, seed, difficulty). */
  createLevel(seed: string, difficulty: DifficultyBand): PuzzleLevel<TState>;
  /** Curated level that is always valid, served when generation fails. */
  fallbackLevel(difficulty: DifficultyBand): PuzzleLevel<TState>;
  validateLevel(level: PuzzleLevel<TState>): ValidationResult;
  /** Must return the same state reference when the action is invalid or has no effect. */
  reduce(state: TState, action: TAction): TState;
  isComplete(state: TState): boolean;
  /** Optional: games with a losing condition report it here. */
  isFailed?(state: TState): boolean;
  score(state: TState, context: ScoreContext): number;
  /** Optional progressive hints; tier 1 is the gentlest. */
  hint?(state: TState, tier: HintTier): GameHint;
}

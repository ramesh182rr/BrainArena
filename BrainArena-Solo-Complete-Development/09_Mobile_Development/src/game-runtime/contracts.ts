export type DifficultyBand = "intro" | "easy" | "standard" | "advanced" | "expert";

export type GameStatus =
  | "loading" | "ready" | "playing" | "paused"
  | "succeeded" | "failed" | "summary" | "exited";

export interface PuzzleLevel<TState = unknown> {
  gameId: string;
  levelId: string;
  generatorVersion: string;
  seed: string;
  difficulty: DifficultyBand;
  initialState: TState;
  metadata: Record<string, string | number | boolean>;
}

export interface ValidationResult {
  valid: boolean;
  reasonCode?: string;
  solutionFingerprint?: string;
}

export interface GameModule<TState = unknown, TAction = unknown> {
  id: string;
  version: string;
  createLevel(seed: string, difficulty: DifficultyBand): PuzzleLevel<TState>;
  reduce(state: TState, action: TAction): TState;
  validateLevel(level: PuzzleLevel<TState>): ValidationResult;
  isComplete(state: TState): boolean;
  score(state: TState): number;
}

export interface GameEvent {
  eventId: string;
  type: string;
  occurredAt: string;
  gameId: string;
  payloadVersion: number;
  payload: Record<string, unknown>;
}

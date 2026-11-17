import type { ComponentType } from 'react';

import type { DifficultyBand, ScoreContext } from '@/game-runtime/contracts';

export interface GameBoardProps<TState, TAction> {
  state: TState;
  onAction: (action: TAction) => void;
  /** Board element ids to emphasise, from a hint. */
  highlightIds: readonly string[];
  /** True while paused or after the level ends. */
  disabled: boolean;
}

export interface TutorialStep {
  seed: string;
  difficulty: DifficultyBand;
  intro: string;
}

/**
 * Presentation layer for one game. Rules stay in the GameModule; this holds
 * the board component and player-facing copy only.
 */
export interface GameUi<TState, TAction> {
  gameId: string;
  howToPlay: readonly string[];
  tutorials: readonly TutorialStep[];
  Board: ComponentType<GameBoardProps<TState, TAction>>;
  /** Short progress line shown above the board, e.g. "Turns 3 · Par 5". */
  statusLine(state: TState): string;
  /** Optional reminder about a rule that appears on this board. */
  levelNote(state: TState): string | null;
  /** Explains a completed level's score in one or two sentences. */
  scoreExplanation(state: TState, context: ScoreContext): string;
  /** 1–3 stars for a completed level's score. */
  starsFor(score: number): 1 | 2 | 3;
  undoAction?: TAction;
  resetAction?: TAction;
}

type AnyGameUi = GameUi<unknown, unknown>;

const uiRegistry = new Map<string, AnyGameUi>();

export function registerGameUi<TState, TAction>(ui: GameUi<TState, TAction>): void {
  uiRegistry.set(ui.gameId, ui as unknown as AnyGameUi);
}

export function getGameUi(gameId: string): AnyGameUi | undefined {
  return uiRegistry.get(gameId);
}

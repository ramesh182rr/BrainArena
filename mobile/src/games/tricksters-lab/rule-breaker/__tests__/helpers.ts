import { currentExam } from '../module';
import { passes } from '../rules';
import type { RuleBreakerAction, RuleBreakerState } from '../types';

/** The correct answers for the current exam. */
export function correctAnswers(state: RuleBreakerState): boolean[] {
  return currentExam(state).map((s) => passes(state.rule, s));
}

export function testAll(state: RuleBreakerState, count = state.par): RuleBreakerAction[] {
  return Array.from({ length: count }, (_, index) => ({ type: 'test', index }) as const);
}

import type { GameStatus } from '../contracts';
import { canTransition, isTerminal, transition, type LifecycleEvent } from '../lifecycle';

const statuses: GameStatus[] = ['loading', 'ready', 'playing', 'paused', 'succeeded', 'failed', 'summary', 'exited'];
const events: LifecycleEvent[] = ['LOADED', 'START', 'PAUSE', 'RESUME', 'SUCCEED', 'FAIL', 'SHOW_SUMMARY', 'EXIT'];

describe('lifecycle', () => {
  it('walks the success path', () => {
    const path: LifecycleEvent[] = ['LOADED', 'START', 'PAUSE', 'RESUME', 'SUCCEED', 'SHOW_SUMMARY', 'EXIT'];
    const seen = path.reduce<GameStatus[]>((acc, e) => [...acc, transition(acc[acc.length - 1]!, e)], ['loading']);
    expect(seen).toEqual(['loading', 'ready', 'playing', 'paused', 'playing', 'succeeded', 'summary', 'exited']);
  });

  it('walks the failure path', () => {
    expect(transition('playing', 'FAIL')).toBe('failed');
    expect(transition('failed', 'SHOW_SUMMARY')).toBe('summary');
  });

  it.each([
    ['loading', 'START'],
    ['ready', 'SUCCEED'],
    ['paused', 'SUCCEED'],
    ['paused', 'FAIL'],
    ['succeeded', 'SUCCEED'],
    ['succeeded', 'RESUME'],
    ['summary', 'START'],
  ] as [GameStatus, LifecycleEvent][])('ignores %s + %s', (status, event) => {
    expect(canTransition(status, event)).toBe(false);
    expect(transition(status, event)).toBe(status);
  });

  it('allows exit from every status except exited', () => {
    for (const s of statuses) expect(canTransition(s, 'EXIT')).toBe(s !== 'exited');
  });

  it('exited is a dead end', () => {
    for (const e of events) expect(transition('exited', e)).toBe('exited');
  });

  it('classifies terminal statuses', () => {
    expect(statuses.filter(isTerminal)).toEqual(['succeeded', 'failed', 'summary', 'exited']);
  });
});

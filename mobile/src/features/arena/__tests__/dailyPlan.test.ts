import { registerAllGames } from '@/games';

import { chooseBand, localDate, parsePlan, planDaily, resizePlan, swapPick, type Attempt, type GameHistory } from '../dailyPlan';
import { arenaCandidates } from '../useDailyArena';

registerAllGames();
const candidates = arenaCandidates();
const DATE = '2026-11-18';
const at = (day: number) => `2026-11-${String(day).padStart(2, '0')}T10:00:00.000Z`;

function history(gameId: string, attempts: Partial<Attempt>[]): GameHistory {
  return { gameId, attempts: attempts.map((a, i) => ({ difficulty: 'easy', outcome: 'succeeded', hintsUsed: 0, at: at(17 - i), ...a })) };
}
const base = { date: DATE, playerSeed: 'player-1', size: 3 as const, candidates, histories: new Map<string, GameHistory>() };

describe('Daily Arena difficulty', () => {
  it('starts new games at Intro', () => {
    expect(chooseBand(undefined)).toEqual({ band: 'intro', reason: 'Starting gently at Intro' });
  });

  it('steps up one band after 3 of the last 4 solved with few hints', () => {
    const h = history('g', [{}, {}, {}, { outcome: 'failed' }]);
    expect(chooseBand(h).band).toBe('standard');
    expect(chooseBand(h).reason).toMatch(/3 of your last 4 at Easy/);
  });

  it('does not step up when hints did the work, or on too little data', () => {
    expect(chooseBand(history('g', [{ hintsUsed: 3 }, { hintsUsed: 2 }, {}, {}])).band).toBe('easy');
    expect(chooseBand(history('g', [{}, {}])).band).toBe('easy');
  });

  it('eases off only after 2 of the last 3 were missed or left, never from one miss', () => {
    expect(chooseBand(history('g', [{ outcome: 'failed' }, {}, {}])).band).toBe('easy');
    expect(chooseBand(history('g', [{ outcome: 'failed' }, { outcome: 'abandoned' }, {}])).band).toBe('intro');
  });

  it('holds the band while it changed recently (no oscillation)', () => {
    const h = history('g', [{ difficulty: 'standard', outcome: 'failed' }, { difficulty: 'standard', outcome: 'failed' }, {}, {}, {}]);
    expect(chooseBand(h)).toEqual({ band: 'standard', reason: 'Settling in at Standard' });
  });

  it('never goes past Expert or below Intro', () => {
    expect(chooseBand(history('g', [{ difficulty: 'expert' }, { difficulty: 'expert' }, { difficulty: 'expert' }])).band).toBe('expert');
    expect(chooseBand(history('g', [{ difficulty: 'intro', outcome: 'failed' }, { difficulty: 'intro', outcome: 'failed' }, { difficulty: 'intro', outcome: 'failed' }])).band).toBe('intro');
  });
});

describe('Daily Arena plan', () => {
  it('is deterministic per day and player, and differs across days', () => {
    expect(planDaily(base)).toEqual(planDaily(base));
    const days = new Set(Array.from({ length: 7 }, (_, d) => planDaily({ ...base, date: `2026-11-${10 + d}` }).picks.map((p) => p.gameId).join()));
    expect(days.size).toBeGreaterThan(3);
  });

  it('picks the requested number of distinct games from different worlds, with stable seeds', () => {
    for (const size of [3, 4, 5] as const) {
      const plan = planDaily({ ...base, size });
      expect(plan.picks.map((p) => p.slot)).toEqual(Array.from({ length: size }, (_, i) => i));
      expect(new Set(plan.picks.map((p) => p.gameId)).size).toBe(size);
      const worlds = plan.picks.map((p) => candidates.find((c) => c.id === p.gameId)!.worldId);
      expect(new Set(worlds).size).toBe(size);
      expect(plan.picks[0]!.seed).toBe(`daily-${DATE}-0`);
    }
  });

  it('includes a comfortable favourite and something new when history allows', () => {
    const fav = candidates[0]!.id;
    const histories = new Map([[fav, history(fav, [{}, {}, {}])]]);
    const plan = planDaily({ ...base, histories });
    const comfort = plan.picks.find((p) => p.kind === 'comfort');
    expect(comfort?.gameId).toBe(fav);
    expect(comfort?.reason).toBe('A favourite: 3 solved');
    expect(plan.picks.some((p) => p.kind === 'novelty' && p.reason === 'New for you')).toBe(true);
  });

  it("avoids yesterday's games when others are available", () => {
    const first = planDaily(base);
    const next = planDaily({ ...base, date: '2026-11-19', yesterday: new Set(first.picks.map((p) => p.gameId)) });
    expect(next.picks.some((p) => first.picks.some((q) => q.gameId === p.gameId))).toBe(false);
  });

  it('swaps one slot for a fresh game and puzzle, never re-offering the swapped one today', () => {
    const plan = planDaily(base);
    const swapped = swapPick(plan, 1, base);
    expect(swapped.picks[0]).toEqual(plan.picks[0]);
    expect(swapped.picks[2]).toEqual(plan.picks[2]);
    expect(swapped.picks[1]!.gameId).not.toBe(plan.picks[1]!.gameId);
    expect(swapped.picks[1]!.seed).toBe(`daily-${DATE}-1-s1`);
    const again = swapPick(swapped, 1, base);
    expect([plan.picks[1]!.gameId, swapped.picks[1]!.gameId]).not.toContain(again.picks[1]!.gameId);
  });

  it('resizing keeps the existing picks', () => {
    const plan = planDaily(base);
    const longer = resizePlan(plan, 5, base);
    expect(longer.picks.slice(0, 3)).toEqual(plan.picks);
    expect(longer.picks).toHaveLength(5);
    expect(resizePlan(longer, 3, base).picks).toEqual(plan.picks);
  });

  it('round-trips through storage and rejects stale or malformed plans', () => {
    const plan = planDaily(base);
    expect(parsePlan(JSON.stringify(plan), DATE)).toEqual(plan);
    expect(parsePlan(JSON.stringify(plan), '2026-11-19')).toBeNull();
    expect(parsePlan('{bad', DATE)).toBeNull();
    expect(parsePlan(JSON.stringify({ ...plan, version: 99 }), DATE)).toBeNull();
  });

  it('uses the local calendar date', () => {
    const d = new Date(2026, 10, 18, 23, 30);
    expect(localDate(d.toISOString())).toBe('2026-11-18');
  });
});

import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useRef, useState } from 'react';

import { useAppServices } from '@/app/services';
import { usePreferences } from '@/design-system';
import { games, getWorld, isPlayable } from '@/games/catalogue';

import { localDate, planDaily, resizePlan, swapPick, type ArenaCandidate, type DailyPlan } from './dailyPlan';

export interface DailyArena {
  plan: DailyPlan | null;
  /** Slots completed today. */
  done: ReadonlySet<number>;
  error: boolean;
  swap(slot: number): void;
}

export function arenaCandidates(): ArenaCandidate[] {
  return games.filter((g) => isPlayable(g.id)).map((g) => ({ id: g.id, title: g.title, worldId: g.worldId, worldTitle: getWorld(g.worldId).title }));
}

/** Today's Daily Arena: made once per day from local history, cached, and refreshed whenever the screen is shown. */
export function useDailyArena(): DailyArena {
  const { store, profile, deps } = useAppServices();
  const { arenaSize } = usePreferences();
  const [plan, setPlan] = useState<DailyPlan | null>(null);
  const [done, setDone] = useState<ReadonlySet<number>>(new Set());
  const [error, setError] = useState(false);
  const busy = useRef(false);

  const markDone = useCallback(
    async (p: DailyPlan) => {
      const wins = await store.sessions.arenaWins(profile.id, p.picks.map((x) => x.seed));
      setDone(new Set(p.picks.filter((x) => wins.has(`${x.gameId}|${x.seed}`)).map((x) => x.slot)));
    },
    [store, profile],
  );

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const date = localDate(deps.now());
        const candidates = arenaCandidates();
        const histories = await store.sessions.histories(profile.id);
        let p = await store.daily.load(date);
        if (!p) {
          const yesterday = await store.daily.previousGames(date);
          p = planDaily({ date, playerSeed: profile.id, size: arenaSize, candidates, histories, yesterday });
          await store.daily.save(p, deps.now());
        } else if (p.size !== arenaSize) {
          p = resizePlan(p, arenaSize, { playerSeed: profile.id, candidates, histories });
          await store.daily.save(p, deps.now());
        }
        if (!active) return;
        setPlan(p);
        await markDone(p);
      })().catch(() => active && setError(true));
      return () => {
        active = false;
      };
    }, [store, profile, deps, arenaSize, markDone]),
  );

  const swap = useCallback(
    (slot: number) => {
      if (!plan || busy.current) return;
      busy.current = true;
      (async () => {
        const histories = await store.sessions.histories(profile.id);
        const next = swapPick(plan, slot, { playerSeed: profile.id, candidates: arenaCandidates(), histories });
        await store.daily.save(next, deps.now());
        setPlan(next);
        await markDone(next);
      })()
        .catch(() => setError(true))
        .finally(() => {
          busy.current = false;
        });
    },
    [plan, store, profile, deps, markDone],
  );

  return { plan, done, error, swap };
}

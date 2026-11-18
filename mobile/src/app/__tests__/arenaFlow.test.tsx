import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { localDate } from '@/features/arena/dailyPlan';
import { startSession } from '@/game-runtime/session';
import { getGame } from '@/games/catalogue';
import { getGameModule } from '@/games/registry';

import { AppShell } from '../App';
import type { AppServices } from '../services';
import { createTestServices } from './testServices';

jest.setTimeout(30_000);

let services: AppServices;
let close: () => void;

beforeEach(async () => {
  ({ services, close } = await createTestServices());
});
afterEach(() => close());

async function openArena() {
  await render(<AppShell services={services} />);
  await fireEvent.press(await screen.findByRole('tab', { name: 'Arena' }));
  await screen.findByTestId('arena-pick-2');
}

describe('Daily Arena', () => {
  it("makes today's mix of 3, keeps it for the day, and lets the player swap a game", async () => {
    await openArena();
    const date = localDate(services.deps.now());
    const plan = (await services.store.daily.load(date))!;
    expect(plan.picks).toHaveLength(3);
    expect(screen.getByLabelText('0 of 3 puzzles done today')).toBeTruthy();
    for (const p of plan.picks) expect(screen.getByText(getGame(p.gameId)!.title)).toBeTruthy();

    await fireEvent.press(screen.getByTestId('arena-swap-1'));
    await waitFor(async () => expect((await services.store.daily.load(date))!.picks[1]!.gameId).not.toBe(plan.picks[1]!.gameId));
    const swapped = (await services.store.daily.load(date))!;
    expect(await screen.findByText(getGame(swapped.picks[1]!.gameId)!.title)).toBeTruthy();
    expect(swapped.picks[0]).toEqual(plan.picks[0]);
  });

  it('marks a pick done after its arena level is solved, on the Arena and on Home', async () => {
    await openArena();
    const plan = (await services.store.daily.load(localDate(services.deps.now())))!;
    const pick = plan.picks[0]!;
    // Record a solved arena session for the first pick, as the play screen would.
    const started = startSession(getGameModule(pick.gameId)!, { seed: pick.seed, difficulty: pick.difficulty, mode: 'arena' }, services.deps).session;
    const now = services.deps.now();
    await services.store.sessions.save(services.profile.id, { ...started, status: 'succeeded', outcome: 'succeeded', score: 140, endedAt: now }, now);

    await fireEvent.press(screen.getByRole('tab', { name: 'Home' }));
    expect(await screen.findByLabelText('Daily Arena. 1 of 3 done today.')).toBeTruthy();
    await fireEvent.press(screen.getByRole('tab', { name: 'Arena' }));
    expect(await screen.findByLabelText('1 of 3 puzzles done today')).toBeTruthy();
    expect(screen.getByText('Play again')).toBeTruthy();
  });

  it('opens an arena level in arena mode from a pick', async () => {
    await openArena();
    await fireEvent.press(screen.getByTestId('arena-play-0'));
    await waitFor(async () => {
      const [latest] = await services.store.sessions.listRecent(services.profile.id, 1);
      expect(latest?.mode).toBe('arena');
    });
  });
});

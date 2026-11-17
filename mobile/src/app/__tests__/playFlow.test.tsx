import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { exitSession, startSession } from '@/game-runtime/session';
import { numberMaze } from '@/games/logic-kingdom/number-maze';
import { solvingMoves } from '@/games/logic-kingdom/number-maze/__tests__/helpers';
import { voltCourier } from '@/games/spatial-dimension/volt-courier';
import { solvingActions } from '@/games/spatial-dimension/volt-courier/__tests__/helpers';

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

async function openWorldMap() {
  await render(<AppShell services={services} />);
  await fireEvent.press(await screen.findByRole('tab', { name: 'Worlds' }));
}

async function openVoltCourierFromExplore() {
  await openWorldMap();
  await fireEvent.press(await screen.findByTestId('world-W3'));
  await fireEvent.press(await screen.findByTestId('game-W3-G01'));
  await screen.findByText('How to play');
}

async function pressCells(seed: string) {
  const state = voltCourier.createLevel(seed, 'intro').initialState;
  for (const action of solvingActions(state)) {
    if (action.type === 'rotate') await fireEvent.press(screen.getByTestId(`cell-${action.index}`));
  }
}

describe('play flow', () => {
  it('shows unbuilt games honestly in the catalogue', async () => {
    await openWorldMap();
    expect(await screen.findByLabelText(/Spatial Dimension\. .* 1 of 5 games playable\./)).toBeTruthy();
    expect(screen.getByLabelText(/Trickster's Lab\. .* 0 of 5 games playable\./)).toBeTruthy();
    await fireEvent.press(screen.getByTestId('world-W3'));
    expect(await screen.findByLabelText('Block Escape. Layered cargo choreography. In development.')).toBeTruthy();
  });

  it('plays the first tutorial offline, saves the result and offers the next level', async () => {
    await openVoltCourierFromExplore();
    expect(screen.getByRole('button', { name: 'Tutorial 1. Up next.' })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Tutorial 1. Up next.' }));

    await screen.findByText('Tutorial 1 of 3');
    await pressCells('tutorial-1');
    await fireEvent.press(await screen.findByRole('button', { name: 'See results' }));

    expect(await screen.findByText('Brilliant!')).toBeTruthy();
    expect(screen.getByLabelText('3 of 3 stars')).toBeTruthy();
    expect(screen.getByLabelText('Score: 150')).toBeTruthy();
    expect(screen.getByText(/You matched par/)).toBeTruthy();

    await waitFor(async () => {
      const [record] = await services.store.sessions.listRecent(services.profile.id);
      expect(record).toMatchObject({ gameId: 'W3-G01', levelSeed: 'tutorial-1', status: 'exited', outcome: 'succeeded', score: 150 });
    });
    await waitFor(async () => {
      const events = await services.store.outbox.listPending();
      expect(events.map((e) => e.eventType)).toEqual(['game_started', 'level_completed', 'game_exited']);
    });

    await fireEvent.press(screen.getByRole('button', { name: 'Next level' }));
    expect(await screen.findByText('Tutorial 2 of 3')).toBeTruthy();
  });

  it('keeps a paused board after leaving and resumes it from the game screen and Home', async () => {
    await openVoltCourierFromExplore();
    await fireEvent.press(screen.getByRole('button', { name: /^Tutorial 1\./ }));
    await screen.findByText('Turns 0');
    await fireEvent.press(screen.getByTestId('cell-1'));
    expect(await screen.findByText('Turns 1')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Pause' }));
    expect(await screen.findByTestId('pause-card')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Leave' }));

    await fireEvent.press(await screen.findByRole('button', { name: 'Continue saved level' }));
    expect(await screen.findByText('Turns 1')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Undo' })).toBeEnabled();
  });

  it('Home offers Continue for an unfinished level', async () => {
    const started = startSession(voltCourier, { seed: 'tutorial-2', difficulty: 'easy' }, services.deps);
    await services.store.recordStep(services.profile, started.session, started.events);

    await render(<AppShell services={services} />);
    expect(await screen.findByText('Continue your puzzle')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByText('Tutorial 2 of 3')).toBeTruthy();
  });

  it('gives progressively more specific hints and highlights the board', async () => {
    await openVoltCourierFromExplore();
    await fireEvent.press(screen.getByRole('button', { name: /^Tutorial 1\./ }));
    await screen.findByText('Tutorial 1 of 3');
    await fireEvent.press(screen.getByRole('button', { name: 'Hint' }));
    expect(await screen.findByText('Hint 1')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Hint' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Hint' }));
    expect(await screen.findByText('Hint 3')).toBeTruthy();
    expect(screen.getByText(/Turn the highlighted junction/)).toBeTruthy();
  });

  it('starts a generated level at the chosen difficulty', async () => {
    await openVoltCourierFromExplore();
    await fireEvent.press(screen.getByRole('radio', { name: 'Advanced' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Play Advanced' }));
    expect(await screen.findByText('Advanced level')).toBeTruthy();
    expect(screen.getByText(/Gates \(tiles with a symbol badge\)/)).toBeTruthy();
  });
});

describe('home and rewards', () => {
  it('PLAY on Home starts the featured game, and stars show up after solving', async () => {
    await render(<AppShell services={services} />);
    expect(await screen.findByLabelText('0 stars')).toBeTruthy();
    // With no history, the first playable game in catalogue order is featured: Number Maze.
    await fireEvent.press(screen.getByTestId('home-play'));
    await screen.findByText('Tutorial 1 of 4');
    const maze = numberMaze.createLevel('tutorial-1', 'intro').initialState;
    for (const move of solvingMoves(maze)) {
      if (move.type === 'move') await fireEvent.press(screen.getByTestId(`room-${move.index}`));
    }
    await fireEvent.press(await screen.findByRole('button', { name: 'See results' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Done' }));
    expect(await screen.findByLabelText('3 stars')).toBeTruthy();
    // The last played game is now featured.
    expect(await screen.findByText('Number Maze')).toBeTruthy();
  });

  it('features the most recently played game on Home', async () => {
    const started = startSession(voltCourier, { seed: 'tutorial-1', difficulty: 'intro' }, services.deps);
    await services.store.recordStep(services.profile, exitSession(started.session, services.deps).session, []);
    await render(<AppShell services={services} />);
    expect(await screen.findByText('Volt Courier')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'About Volt Courier' })).toBeTruthy();
  });

  it('saves the motion and haptics settings', async () => {
    await render(<AppShell services={services} />);
    await fireEvent.press(await screen.findByRole('tab', { name: 'Profile' }));
    await fireEvent.press(await screen.findByRole('radio', { name: 'Motion: Reduced' }));
    await fireEvent(screen.getByLabelText('Haptics'), 'valueChange', false);
    await waitFor(async () => {
      expect(await services.store.settings.load()).toEqual({ motion: 'reduced', haptics: false });
    });
    expect(screen.getByRole('radio', { name: 'Motion: Reduced' })).toBeSelected();
  });
});

import { fireEvent, render, screen } from '@testing-library/react-native';

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

describe('how-to-play demo', () => {
  it('opens from the game intro, plays steps with captions, and can skip into the tutorial', async () => {
    await render(<AppShell services={services} />);
    await fireEvent.press(await screen.findByRole('tab', { name: 'Worlds' }));
    await fireEvent.press(await screen.findByTestId('world-W3'));
    await fireEvent.press(await screen.findByTestId('game-W3-G01'));
    await fireEvent.press(await screen.findByTestId('watch-demo'));
    expect(await screen.findByText('How to play')).toBeTruthy();
    // The first step's caption appears once the demo starts acting.
    expect(await screen.findByText(/Tap a conduit to turn it/, {}, { timeout: 3000 })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Skip demo' }));
    expect(await screen.findByText('Tutorial 1 of 3')).toBeTruthy();
  });
});

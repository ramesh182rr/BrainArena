import { fireEvent, render, screen } from '@testing-library/react-native';

import App from '../App';
import { createAppServices } from '../createAppServices';
import { createTestServices } from './testServices';

jest.mock('../createAppServices', () => ({ createAppServices: jest.fn() }));
const mockCreate = createAppServices as jest.MockedFunction<typeof createAppServices>;

describe('App startup', () => {
  it('opens on Home once local data is ready', async () => {
    const { services, close } = await createTestServices();
    mockCreate.mockResolvedValueOnce(services);
    await render(<App />);
    expect(await screen.findByTestId('home-play')).toBeTruthy();
    expect(screen.getByRole('header', { name: 'BrainArena Solo' })).toBeTruthy();
    close();
  });

  it('shows a retry screen when local data cannot be opened, and recovers', async () => {
    const { services, close } = await createTestServices();
    mockCreate.mockRejectedValueOnce(new Error('disk full')).mockResolvedValueOnce(services);
    await render(<App />);
    expect(await screen.findByText(/couldn.t open your saved progress/)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByTestId('home-play')).toBeTruthy();
    close();
  });
});

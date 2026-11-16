import { render, screen } from '@testing-library/react-native';

import App from '../App';

describe('App', () => {
  it('renders the product title', async () => {
    await render(<App />);
    expect(screen.getByRole('header', { name: 'BrainArena Solo' })).toBeTruthy();
  });
});

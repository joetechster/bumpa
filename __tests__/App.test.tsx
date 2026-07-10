import { render, screen, userEvent } from '@testing-library/react-native';

import App from '../App';

describe('App', () => {
  it('boots to the Home screen', async () => {
    await render(<App />);
    expect(await screen.findByText('The Book Nook')).toBeOnTheScreen();
  });

  it('navigates from Home to the Cart screen', async () => {
    const user = userEvent.setup();
    await render(<App />);

    await user.press(await screen.findByRole('button', { name: /open cart/i }));

    expect(await screen.findByText(/your cart/i)).toBeOnTheScreen();
  });
});

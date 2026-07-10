import { render, screen } from '@testing-library/react-native';

import PriceTag from '../PriceTag';

// The brief's required target: price display — formatting, currency symbol,
// zero, missing price, very large values.

describe('PriceTag', () => {
  it('renders a formatted naira price with the ₦ symbol and thousands grouping', async () => {
    await render(<PriceTag priceKobo={250_000} />);
    expect(screen.getByText('₦2,500')).toBeOnTheScreen();
  });

  it('renders zero as ₦0, not blank', async () => {
    await render(<PriceTag priceKobo={0} />);
    expect(screen.getByText('₦0')).toBeOnTheScreen();
  });

  it('renders a missing price as an em-dash with an accessible label', async () => {
    await render(<PriceTag priceKobo={null} />);
    expect(screen.getByText('—')).toBeOnTheScreen();
    expect(screen.getByLabelText('Price unavailable')).toBeOnTheScreen();
  });

  it('renders very large values with full grouping', async () => {
    await render(<PriceTag priceKobo={987_654_321_00} />);
    expect(screen.getByText('₦987,654,321')).toBeOnTheScreen();
  });

  it('renders kobo remainders as two decimal places', async () => {
    await render(<PriceTag priceKobo={250_050} />);
    expect(screen.getByText('₦2,500.50')).toBeOnTheScreen();
  });

  it('exposes the price as its accessibility label', async () => {
    await render(<PriceTag priceKobo={250_000} />);
    expect(screen.getByLabelText('₦2,500')).toBeOnTheScreen();
  });
});

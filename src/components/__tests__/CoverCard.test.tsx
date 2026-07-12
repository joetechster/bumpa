import { render, screen, userEvent } from '@testing-library/react-native';

import { FlightProvider } from '../../animation/flightController';
import type { Book } from '../../domain/book';
import CoverCard from '../CoverCard';

const book = (overrides: Partial<Book> = {}): Book => ({
  id: 'OL1W',
  title: 'Ficciones',
  authors: ['Jorge Luis Borges'],
  coverUrl: 'https://covers.example/1-M.jpg',
  firstPublishYear: 1944,
  priceKobo: 250_000,
  rating: 4.3,
  ...overrides,
});

async function renderCard(
  props: Partial<React.ComponentProps<typeof CoverCard>> = {},
  flightEnabled = true,
) {
  const onPress = jest.fn();
  const onAddToCart = jest.fn();
  await render(
    <FlightProvider enabled={flightEnabled}>
      <CoverCard book={book()} onPress={onPress} onAddToCart={onAddToCart} {...props} />
    </FlightProvider>,
  );
  return { onPress, onAddToCart };
}

describe('CoverCard', () => {
  it('shows the title and author, and opens details when the cover is pressed', async () => {
    const user = userEvent.setup();
    const { onPress } = await renderCard();

    expect(screen.getByText('Jorge Luis Borges')).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: /ficciones, view details/i }));

    expect(onPress).toHaveBeenCalledWith(expect.objectContaining({ id: 'OL1W' }));
  });

  it('falls back to the title on the cover when the book has no cover image', async () => {
    await renderCard({ book: book({ coverUrl: null }) });

    // Twice: the title line beneath the card, and the placeholder standing in
    // for the missing artwork.
    expect(screen.getAllByText('Ficciones')).toHaveLength(2);
  });

  it('says "Unknown author" rather than rendering an empty line', async () => {
    await renderCard({ book: book({ authors: [] }) });

    expect(screen.getByText('Unknown author')).toBeOnTheScreen();
  });

  it('the add button reports the book and a ref to its cover, for the flight to measure', async () => {
    const user = userEvent.setup();
    const { onAddToCart } = await renderCard();

    await user.press(screen.getByRole('button', { name: /add ficciones to cart/i }));

    expect(onAddToCart).toHaveBeenCalledTimes(1);
    const [reportedBook, coverRef] = onAddToCart.mock.calls[0];
    expect(reportedBook).toEqual(expect.objectContaining({ id: 'OL1W' }));
    // The ref must point at a mounted node, or measureInWindow has nothing to
    // measure and the ghost never launches.
    expect(coverRef.current).not.toBeNull();
  });

  it('still adds to the cart when the flying animation is disabled', async () => {
    const user = userEvent.setup();
    const { onAddToCart } = await renderCard({}, false);

    await user.press(screen.getByRole('button', { name: /add ficciones to cart/i }));

    // The cart is not downstream of the animation: the add fires either way.
    expect(onAddToCart).toHaveBeenCalledTimes(1);
  });

  it('pressing the add button does not also open the details screen', async () => {
    const user = userEvent.setup();
    const { onPress, onAddToCart } = await renderCard();

    await user.press(screen.getByRole('button', { name: /add ficciones to cart/i }));

    expect(onAddToCart).toHaveBeenCalledTimes(1);
    expect(onPress).not.toHaveBeenCalled();
  });
});

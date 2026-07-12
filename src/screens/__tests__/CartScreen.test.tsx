import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { render, screen, userEvent } from '@testing-library/react-native';

import type { Book } from '../../domain/book';
import type { RootStackParamList } from '../../navigation/types';
import { useCartStore } from '../../store/cartStore';
import CartScreen from '../CartScreen';

// The brief's required target: the cart component, driven through the UI:
// increment, decrement, decrement-to-zero, remove, and the derived total.

const book = (id: string, title: string, priceKobo: number): Book => ({
  id,
  title,
  authors: [],
  coverUrl: null,
  firstPublishYear: null,
  priceKobo,
  rating: 4.0,
});

const ficciones = book('OL1W', 'Ficciones', 250_000);
const dune = book('OL2W', 'Dune', 199_900);

const Stack = createNativeStackNavigator<RootStackParamList>();

function Harness() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Cart" component={CartScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

beforeEach(() => {
  useCartStore.setState({ lines: [], hydrated: true });
});

describe('CartScreen', () => {
  it('shows the empty state once hydrated with no lines', async () => {
    await render(<Harness />);
    expect(screen.getByText(/your cart is empty/i)).toBeOnTheScreen();
  });

  it('renders NOTHING cart-shaped before rehydration settles (no empty flash)', async () => {
    useCartStore.setState({ lines: [], hydrated: false });
    await render(<Harness />);
    expect(screen.queryByText(/your cart is empty/i)).not.toBeOnTheScreen();
  });

  it('shows lines with per-line totals and the derived cart total', async () => {
    useCartStore.getState().addBook(ficciones);
    useCartStore.getState().addBook(dune);
    useCartStore.getState().setQuantity('OL2W', 2);

    await render(<Harness />);

    expect(screen.getByText('Ficciones')).toBeOnTheScreen();
    expect(screen.getByText('₦2,500')).toBeOnTheScreen(); // line total ×1
    expect(screen.getByText('₦3,998')).toBeOnTheScreen(); // 1,999 × 2
    expect(screen.getByText('₦6,498')).toBeOnTheScreen(); // derived total
  });

  it('increments quantity through the stepper and the total follows', async () => {
    useCartStore.getState().addBook(ficciones);
    const user = userEvent.setup();
    await render(<Harness />);

    await user.press(screen.getByRole('button', { name: /increase quantity of ficciones/i }));

    expect(useCartStore.getState().lines[0].quantity).toBe(2);
    expect(await screen.findAllByText('₦5,000')).not.toHaveLength(0); // line + total
  });

  it('decrements quantity through the stepper', async () => {
    useCartStore.getState().addBook(ficciones);
    useCartStore.getState().setQuantity('OL1W', 3);
    const user = userEvent.setup();
    await render(<Harness />);

    await user.press(screen.getByRole('button', { name: /decrease quantity of ficciones/i }));

    expect(useCartStore.getState().lines[0].quantity).toBe(2);
  });

  it('decrementing at quantity 1 removes the line (D21) - the button says so', async () => {
    useCartStore.getState().addBook(ficciones);
    const user = userEvent.setup();
    await render(<Harness />);

    await user.press(screen.getByRole('button', { name: /remove ficciones from cart/i }));

    expect(useCartStore.getState().lines).toEqual([]);
    expect(await screen.findByText(/your cart is empty/i)).toBeOnTheScreen();
  });

  it('the Remove action deletes the whole line regardless of quantity', async () => {
    useCartStore.getState().addBook(dune);
    useCartStore.getState().setQuantity('OL2W', 5);
    const user = userEvent.setup();
    await render(<Harness />);

    await user.press(screen.getByRole('button', { name: /remove all dune from cart/i }));

    expect(useCartStore.getState().lines).toEqual([]);
  });

  it('duplicate adds merge into one line whose quantity shows in the stepper', async () => {
    useCartStore.getState().addBook(ficciones);
    useCartStore.getState().addBook(ficciones);

    await render(<Harness />);

    expect(screen.getAllByText('Ficciones')).toHaveLength(1);
    expect(screen.getByLabelText('Quantity: 2')).toBeOnTheScreen();
  });
});

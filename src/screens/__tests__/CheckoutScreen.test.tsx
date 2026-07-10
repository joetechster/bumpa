import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { act, render, screen, userEvent } from '@testing-library/react-native';

import type { Book } from '../../domain/book';
import type { RootStackParamList } from '../../navigation/types';
import { useCartStore } from '../../store/cartStore';
import CheckoutScreen from '../CheckoutScreen';

// Mock the Paystack hook — the WebView itself has no useful Jest surface
// (paystack-checkout skill). We assert the exact payload and drive callbacks.
const mockCheckout = jest.fn();
jest.mock('react-native-paystack-webview', () => ({
  usePaystack: () => ({ popup: { checkout: mockCheckout, newTransaction: jest.fn() } }),
  PaystackProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('../../config/env', () => ({ PAYSTACK_PUBLIC_KEY: 'pk_test_mock' }));

const book = (id: string, priceKobo: number): Book => ({
  id,
  title: `Book ${id}`,
  authors: [],
  coverUrl: null,
  firstPublishYear: null,
  priceKobo,
  rating: 4.0,
});

// ₦2,500 + ₦1,999 × 2 = ₦6,498 → 649,800 kobo → Paystack amount 6498 (major units)
const seedCart = () => {
  useCartStore.setState({
    hydrated: true,
    lines: [
      { book: book('OL1W', 250_000), quantity: 1 },
      { book: book('OL2W', 199_900), quantity: 2 },
    ],
  });
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function Harness() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Checkout" component={CheckoutScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

async function fillEmailAndPay(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Email for receipt'), 'reader@example.com');
  await user.press(screen.getByRole('button', { name: /pay with paystack/i }));
}

beforeEach(() => {
  seedCart();
});

describe('CheckoutScreen', () => {
  it('hands popup.checkout the EXACT payload: major-unit integer amount, email, bn_ reference', async () => {
    const user = userEvent.setup();
    await render(<Harness />);

    await fillEmailAndPay(user);

    expect(mockCheckout).toHaveBeenCalledTimes(1);
    const payload = mockCheckout.mock.calls[0][0];
    expect(payload).toMatchObject({
      email: 'reader@example.com',
      amount: 6498, // whole naira — the wrapper multiplies by 100 itself
    });
    expect(Number.isSafeInteger(payload.amount)).toBe(true);
    expect(payload.reference).toMatch(/^bn_\d+_[a-z0-9]+$/);
    expect(typeof payload.onSuccess).toBe('function');
    expect(typeof payload.onCancel).toBe('function');
    expect(typeof payload.onError).toBe('function');
  });

  it('generates a UNIQUE reference per payment attempt', async () => {
    const user = userEvent.setup();
    await render(<Harness />);

    await fillEmailAndPay(user);
    // Simulate cancel → back on the form → pay again.
    const first = mockCheckout.mock.calls[0][0];
    await user.press(screen.getByRole('button', { name: /pay with paystack/i })); // no-op while paying
    await act(async () => first.onCancel());
    await user.press(await screen.findByRole('button', { name: /pay with paystack/i }));

    expect(mockCheckout).toHaveBeenCalledTimes(2);
    const second = mockCheckout.mock.calls[1][0];
    expect(second.reference).not.toBe(first.reference);
  });

  it('onSuccess clears the cart and shows the receipt with the reference', async () => {
    const user = userEvent.setup();
    await render(<Harness />);
    await fillEmailAndPay(user);

    const { onSuccess } = mockCheckout.mock.calls[0][0];
    await user.press(screen.getByRole('button', { name: /pay with paystack/i })); // still paying — no double call
    await act(async () =>
      onSuccess({ reference: 'bn_123_abc', trans: 't', transaction: 't', status: 'success' }),
    );

    expect(await screen.findByText(/payment successful/i)).toBeOnTheScreen();
    expect(screen.getByText(/bn_123_abc/)).toBeOnTheScreen();
    expect(useCartStore.getState().lines).toEqual([]); // cleared on success ONLY
  });

  it('onCancel returns to the form with the cart INTACT and no error UI', async () => {
    const user = userEvent.setup();
    await render(<Harness />);
    await fillEmailAndPay(user);

    await act(async () => mockCheckout.mock.calls[0][0].onCancel());

    expect(await screen.findByText(/payment cancelled — your cart is untouched/i)).toBeOnTheScreen();
    expect(screen.queryByText(/payment failed/i)).not.toBeOnTheScreen();
    expect(useCartStore.getState().lines).toHaveLength(2);
    // The form is live again.
    expect(screen.getByRole('button', { name: /pay with paystack/i })).toBeOnTheScreen();
  });

  it('onError keeps the cart, shows the failure with a retry path', async () => {
    const user = userEvent.setup();
    await render(<Harness />);
    await fillEmailAndPay(user);

    await act(async () => mockCheckout.mock.calls[0][0].onError({ message: 'Insufficient funds' }));

    expect(await screen.findByText(/payment failed/i)).toBeOnTheScreen();
    expect(screen.getByText('Insufficient funds')).toBeOnTheScreen();
    expect(useCartStore.getState().lines).toHaveLength(2);

    await user.press(screen.getByRole('button', { name: /try payment again/i }));
    expect(await screen.findByRole('button', { name: /pay with paystack/i })).toBeOnTheScreen();
  });

  it('does not launch the popup with an invalid email', async () => {
    const user = userEvent.setup();
    await render(<Harness />);

    await user.type(screen.getByLabelText('Email for receipt'), 'not-an-email');
    await user.press(screen.getByRole('button', { name: /pay with paystack/i }));

    expect(mockCheckout).not.toHaveBeenCalled();
  });
});

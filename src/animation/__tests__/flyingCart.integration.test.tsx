// fireEvent (not userEvent) on purpose: userEvent advances fake timers to
// simulate press duration, which would land early ghosts before we assert
// overlap. fireEvent keeps the clock fully under the test's control.
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { useEffect } from 'react';
import { AccessibilityInfo, Button } from 'react-native';

import { FLIGHT_DURATION_MS } from '../animation.constants';
import { CartNode, FlightProvider, Rect, useFlightController } from '../flightController';
import FlyingCartOverlay from '../FlyingCartOverlay';
import CartBadge from '../../components/CartBadge';
import type { Book } from '../../domain/book';
import { useCartStore } from '../../store/cartStore';

// Integration surface for the four graded animation behaviours. Reanimated is
// running under its official Jest mock (setUpTests in jest.setup.ts), so
// motion itself isn't assertable - mounting, landing, counts, and the
// instant-path branches are.

const book: Book = {
  id: 'OL1W',
  title: 'Ficciones',
  authors: [],
  coverUrl: null,
  firstPublishYear: null,
  priceKobo: 250_000,
  rating: 4.0,
};

const sourceRect: Rect = { x: 16, y: 200, width: 64, height: 100 };

/** Stands in for the cart badge's view. The real CartBadge below registers its
 *  own node too, but the test renderer cannot measure it - so this fake is what
 *  gives the controller a usable target. It measures synchronously, keeping the
 *  ghost's mount inside the press handler. */
const targetNode: CartNode = {
  measureInWindow: (cb) => cb(320, 40, 32, 32),
} as CartNode;

/** A minimal "screen": an add button that updates the STORE FIRST, then
 *  starts a flight - the same contract HomeScreen implements. */
function AddButton() {
  const { startFlight, registerCartNode, unregisterCartNode } = useFlightController();
  useEffect(() => {
    registerCartNode(targetNode);
    return () => unregisterCartNode(targetNode);
  }, [registerCartNode, unregisterCartNode]);

  return (
    <Button
      title="add"
      onPress={() => {
        useCartStore.getState().addBook(book);
        startFlight(sourceRect, book.coverUrl);
      }}
    />
  );
}

// CartBadge is mounted BEFORE AddButton on purpose. Badges register on mount and
// the last one registered is the target, so this puts AddButton's measurable fake
// on top of the real badge's node - which the test renderer cannot measure (no
// measureInWindow off-device). Reverse the order and every flight correctly
// degrades to the instant path, and none of the assertions below have a ghost to
// find. On device the real badge measures fine and is the only one registered.
function Harness({ enabled = true }: { enabled?: boolean }) {
  return (
    <FlightProvider enabled={enabled}>
      <CartBadge onPress={() => {}} />
      <AddButton />
      <FlyingCartOverlay />
    </FlightProvider>
  );
}

beforeEach(() => {
  useCartStore.setState({ lines: [], hydrated: true });
});

afterEach(() => {
  // clearMocks resets calls but NOT implementations - without this, the
  // reduced-motion spy would leak into later tests and force the instant path.
  jest.restoreAllMocks();
});

describe('flying cart integration', () => {
  it('ten rapid taps: store hits 10 immediately, ten ghosts fly, badge converges to 10 on landing', async () => {
    jest.useFakeTimers();
    try {
      await render(<Harness />);

      const add = screen.getByRole('button', { name: 'add' });
      for (let i = 0; i < 10; i++) {
        await fireEvent.press(add);
      }

      // The store is ahead of the badge: cart is truth, badge is presentation.
      expect(useCartStore.getState().lines[0].quantity).toBe(10);
      expect(screen.getAllByTestId(/flying-ghost-/)).toHaveLength(10);
      // All ten in flight → displayed count still 0 → badge hidden.
      expect(screen.getByLabelText('Open cart, 0 items')).toBeOnTheScreen();

      // Land everything.
      await act(async () => {
        jest.advanceTimersByTime(FLIGHT_DURATION_MS + 50);
      });

      expect(screen.queryAllByTestId(/flying-ghost-/)).toHaveLength(0); // no leaked overlays
      expect(screen.getByLabelText('Open cart, 10 items')).toBeOnTheScreen();
    } finally {
      jest.useRealTimers();
    }
  });

  it('badge count increments on LANDING, not on tap', async () => {
    jest.useFakeTimers();
    try {
      await render(<Harness />);

      await fireEvent.press(screen.getByRole("button", { name: "add" }));

      expect(useCartStore.getState().lines).toHaveLength(1); // store: on tap
      expect(screen.getByLabelText('Open cart, 0 items')).toBeOnTheScreen(); // badge: not yet

      await act(async () => {
        jest.advanceTimersByTime(FLIGHT_DURATION_MS + 50);
      });

      expect(screen.getByLabelText('Open cart, 1 item')).toBeOnTheScreen(); // badge: on landing
    } finally {
      jest.useRealTimers();
    }
  });

  it('FEATURE_FLYING_CART off: no ghost mounts and the badge updates instantly', async () => {
    await render(<Harness enabled={false} />);

    await fireEvent.press(screen.getByRole('button', { name: 'add' }));

    expect(useCartStore.getState().lines).toHaveLength(1); // cart still right
    expect(screen.queryAllByTestId(/flying-ghost-/)).toHaveLength(0);
    expect(screen.getByLabelText('Open cart, 1 item')).toBeOnTheScreen();
  });

  it('reduced motion takes the instant path: no ghost, immediate badge', async () => {
    jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockResolvedValue(true);
    await render(<Harness />);
    // Let the async isReduceMotionEnabled() settle into state.
    await act(async () => {});

    await fireEvent.press(screen.getByRole('button', { name: 'add' }));

    expect(screen.queryAllByTestId(/flying-ghost-/)).toHaveLength(0);
    expect(screen.getByLabelText('Open cart, 1 item')).toBeOnTheScreen();
    expect(useCartStore.getState().lines).toHaveLength(1);
  });

  it('unmounting mid-flight cancels cleanly with no state update afterwards', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
    jest.useFakeTimers();
    try {
      const { unmount } = await render(<Harness />);

      await fireEvent.press(screen.getByRole("button", { name: "add" }));
      expect(screen.getAllByTestId(/flying-ghost-/)).toHaveLength(1);

      await unmount();

      // If the terminal callback fired into unmounted state, React would warn
      // and the console trap in jest.setup.ts would fail this test.
      await act(async () => {
        jest.advanceTimersByTime(FLIGHT_DURATION_MS + 50);
      });
      expect(useCartStore.getState().lines).toHaveLength(1); // cart untouched by teardown
    } finally {
      jest.useRealTimers();
    }
  });
});

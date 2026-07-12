import { render, screen, fireEvent } from '@testing-library/react-native';
import { RefObject, useEffect } from 'react';
import { Button, Text, View } from 'react-native';

import { CartNode, FlightProvider, useFlightController } from '../flightController';
import FlyingCartOverlay from '../FlyingCartOverlay';
import { useFlyToCart } from '../useFlyToCart';

// The measurement seam: fake "nodes" stand in for the RN views so every guard
// branch is exercised - the real measureInWindow only exists on device. BOTH
// ends of the flight go through it now: the source cover (via the ref) and the
// cart badge (via the node registry), each measured at tap time.

type FakeNode = {
  measureInWindow?: (cb: (x: number, y: number, w: number, h: number) => void) => void;
};

/** Measures synchronously, as the fake bridge does - so a ghost mounts inside
 *  the press handler and the assertions below need no timer advance. */
const nodeAt = (x: number, y: number, w = 32, h = 32): FakeNode => ({
  measureInWindow: (cb) => cb(x, y, w, h),
});

const targetNode = nodeAt(300, 40);

function Harness({ node, target = targetNode }: { node: FakeNode | null; target?: FakeNode }) {
  return (
    <FlightProvider enabled>
      <Trigger node={node} target={target} />
      <FlyingCartOverlay />
    </FlightProvider>
  );
}

function Trigger({ node, target }: { node: FakeNode | null; target: FakeNode }) {
  const { registerCartNode, unregisterCartNode } = useFlightController();
  useEffect(() => {
    const cartNode = target as CartNode;
    registerCartNode(cartNode);
    return () => unregisterCartNode(cartNode);
  }, [target, registerCartNode, unregisterCartNode]);

  const flyToCart = useFlyToCart();
  const fakeRef = { current: node } as unknown as RefObject<View | null>;
  return <Button title="fly" onPress={() => flyToCart(fakeRef, null)} />;
}

const press = async () => {
  await fireEvent.press(screen.getByRole('button', { name: 'fly' }));
};

describe('useFlyToCart', () => {
  it('starts a flight from the measured window rect', async () => {
    const node: FakeNode = {
      measureInWindow: (cb) => cb(16, 200, 64, 100),
    };
    await render(<Harness node={node} />);

    await press();

    expect(screen.getAllByTestId(/flying-ghost-/)).toHaveLength(1);
  });

  it('degrades to no flight when the ref is empty', async () => {
    await render(<Harness node={null} />);
    await press();
    expect(screen.queryAllByTestId(/flying-ghost-/)).toHaveLength(0);
  });

  it('degrades to no flight when the node cannot measure (e.g. test renderer)', async () => {
    await render(<Harness node={{}} />);
    await press();
    expect(screen.queryAllByTestId(/flying-ghost-/)).toHaveLength(0);
  });

  it('degrades to no flight on NaN measurements - never flies from (0,0)', async () => {
    const node: FakeNode = {
      measureInWindow: (cb) => cb(NaN, NaN, NaN, NaN),
    };
    await render(<Harness node={node} />);
    await press();
    expect(screen.queryAllByTestId(/flying-ghost-/)).toHaveLength(0);
  });
});

// The target half of the seam - the half that shipped the Book Details bug.
// The ghost's destination lives inside a worklet (mocked here), so it is not
// readable from the rendered ghost. This probe surfaces the target the
// controller actually chose, which is the thing under test.
function TargetProbe() {
  const { flights } = useFlightController();
  const last = flights[flights.length - 1];
  if (last === undefined) return null;
  return <Text testID="target">{`${last.target.x},${last.target.y}`}</Text>;
}

describe('useFlyToCart - the landing target', () => {
  const source = nodeAt(16, 200, 64, 100);

  /** A screen with `badges` mounted bottom-first, as a native stack mounts them. */
  function Screen({ badges, onMounted }: { badges: FakeNode[]; onMounted?: Unregister }) {
    const { registerCartNode, unregisterCartNode } = useFlightController();
    useEffect(() => {
      const nodes = badges.map((badge) => badge as CartNode);
      nodes.forEach(registerCartNode);
      onMounted?.({ nodes, unregisterCartNode });
      return () => nodes.forEach(unregisterCartNode);
    }, [badges, onMounted, registerCartNode, unregisterCartNode]);

    const flyToCart = useFlyToCart();
    const ref = { current: source } as unknown as RefObject<View | null>;
    return <Button title="fly" onPress={() => flyToCart(ref, null)} />;
  }

  type Unregister = (arg: { nodes: CartNode[]; unregisterCartNode: (n: CartNode) => void }) => void;

  const renderScreen = (badges: FakeNode[], onMounted?: Unregister) =>
    render(
      <FlightProvider enabled>
        <Screen badges={badges} onMounted={onMounted} />
        <TargetProbe />
        <FlyingCartOverlay />
      </FlightProvider>,
    );

  it('measures the badge at TAP time, not at registration time', async () => {
    // A node whose position changes between mount and tap - what a native-stack
    // header does as it settles after a push. The old code cached the first
    // reading (x=0, header-local) and aimed at the top-left corner forever.
    let x = 0;
    const settling: FakeNode = { measureInWindow: (cb) => cb(x, 40, 32, 32) };
    await renderScreen([settling]);

    x = 300; // the header has now landed in its final window position

    await press();

    expect(screen.getByTestId('target')).toHaveTextContent('300,40');
  });

  it('targets the LAST registered badge - the topmost screen wins', async () => {
    // Home's AppHeader badge stays mounted beneath the pushed Details header.
    await renderScreen([nodeAt(300, 40), nodeAt(340, 60)]);

    await press();

    expect(screen.getByTestId('target')).toHaveTextContent('340,60');
  });

  it('falls back to the badge beneath when the top one unregisters (pop back to Home)', async () => {
    await renderScreen([nodeAt(300, 40), nodeAt(340, 60)], ({ nodes, unregisterCartNode }) => {
      unregisterCartNode(nodes[1]); // Details popped
    });

    await press();

    expect(screen.getByTestId('target')).toHaveTextContent('300,40'); // Home reclaims it
  });

  it('degrades to no flight when no badge is registered at all', async () => {
    await renderScreen([]);
    await press();
    expect(screen.queryAllByTestId(/flying-ghost-/)).toHaveLength(0);
  });

  it.each([
    ['zero-sized', nodeAt(300, 40, 0, 0)],
    ['NaN', nodeAt(NaN, NaN, NaN, NaN)],
    ['fully offscreen', nodeAt(-500, -500)],
  ])('degrades to no flight on a %s target rect', async (_label, target) => {
    await renderScreen([target]);
    await press();
    expect(screen.queryAllByTestId(/flying-ghost-/)).toHaveLength(0);
  });
});

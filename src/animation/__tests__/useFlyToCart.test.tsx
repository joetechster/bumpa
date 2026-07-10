import { render, screen, fireEvent } from '@testing-library/react-native';
import { RefObject } from 'react';
import { Button, View } from 'react-native';

import { FlightProvider, Rect, useFlightController } from '../flightController';
import FlyingCartOverlay from '../FlyingCartOverlay';
import { useFlyToCart } from '../useFlyToCart';

// The measurement seam: a fake "node" stands in for the RN view so every
// guard branch is exercised — the real measureInWindow only exists on device.

type FakeNode = {
  measureInWindow?: (cb: (x: number, y: number, w: number, h: number) => void) => void;
};

const targetRect: Rect = { x: 300, y: 40, width: 32, height: 32 };

function Harness({ node }: { node: FakeNode | null }) {
  return (
    <FlightProvider enabled>
      <Trigger node={node} />
      <FlyingCartOverlay />
    </FlightProvider>
  );
}

function Trigger({ node }: { node: FakeNode | null }) {
  const { registerCartTarget } = useFlightController();
  registerCartTarget(targetRect);
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

  it('degrades to no flight on NaN measurements — never flies from (0,0)', async () => {
    const node: FakeNode = {
      measureInWindow: (cb) => cb(NaN, NaN, NaN, NaN),
    };
    await render(<Harness node={node} />);
    await press();
    expect(screen.queryAllByTestId(/flying-ghost-/)).toHaveLength(0);
  });
});

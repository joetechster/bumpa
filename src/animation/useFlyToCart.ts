import { RefObject, useCallback } from 'react';
import type { View } from 'react-native';

import { useFlightController } from './flightController';

/**
 * Measurement step: measureInWindow the tapped cover. Both ends of the flight
 * are measured this way at tap time - the source here, the cart badge inside
 * startFlight - so both rects land in the same WINDOW coordinate space,
 * already scroll-adjusted. No offset math, no double-count bug. It runs ONCE
 * per tap on the JS thread, before any motion; the per-frame work is all in
 * worklets.
 *
 * Every failure mode degrades to the instant badge path: unmounted ref,
 * NaN measurements, no registered badge, flag off, reduced motion.
 */
export function useFlyToCart() {
  const { startFlight, animationActive } = useFlightController();

  return useCallback(
    (coverRef: RefObject<View | null>, coverUrl: string | null) => {
      if (!animationActive) return;
      const node = coverRef.current;
      if (node === null || typeof node.measureInWindow !== 'function') return;
      node.measureInWindow((x, y, width, height) => {
        // A detached node measures as NaN/undefined - never fly from (0,0).
        if (![x, y, width, height].every((v) => typeof v === 'number' && Number.isFinite(v))) {
          return;
        }
        startFlight({ x, y, width, height }, coverUrl);
      });
    },
    [animationActive, startFlight],
  );
}

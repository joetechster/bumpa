import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import { AccessibilityInfo, Dimensions, View } from 'react-native';

import { FEATURE_FLYING_CART } from '../config/featureFlags';

// The JS-side brain of the flying-cart animation. Everything here is plain
// React state - the per-frame motion lives in FlyingCartOverlay worklets.
//
// Invariants (tested in flightController.test):
// - The cart store is NEVER touched here. The store updates on tap, before
//   any flight starts; flights are decorative bookkeeping.
// - Each flight has a unique id; landing removes by id, so overlapping
//   flights from rapid taps cannot interfere with each other.
// - The badge shows trueCount - inFlightCount (the "displayed count"): each
//   add is invisible on the badge until its ghost lands. With the feature
//   flag off, reduced motion on, or rects unavailable, no flight starts and
//   the badge tracks the store instantly.
//
// The landing target is measured AT TAP TIME from a registered badge node,
// never cached at layout time. A badge hosted in the native-stack header lays
// out while react-native-screens is still installing that header, so its
// onLayout reports header-local coordinates (x ≈ 0), and since the disc's
// frame never changes again, nothing re-measures: every flight from the Book
// Details screen aimed at the top-left corner. By the time a tap happens the
// header has settled, so measuring then is correct on every screen.

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Flight {
  id: number;
  source: Rect;
  target: Rect;
  coverUrl: string | null;
}

export interface FlightState {
  nextId: number;
  flights: Flight[];
}

export type FlightAction =
  | { type: 'started'; source: Rect; target: Rect; coverUrl: string | null }
  | { type: 'landed'; id: number };

export const initialFlightState: FlightState = { nextId: 1, flights: [] };

export function flightReducer(state: FlightState, action: FlightAction): FlightState {
  switch (action.type) {
    case 'started':
      return {
        nextId: state.nextId + 1,
        flights: [
          ...state.flights,
          {
            id: state.nextId,
            source: action.source,
            target: action.target,
            coverUrl: action.coverUrl,
          },
        ],
      };
    case 'landed':
      return { ...state, flights: state.flights.filter((flight) => flight.id !== action.id) };
  }
}

/** Badge arithmetic: displayed = true - inFlight, floored at 0. The clamp
 *  matters when items are removed while ghosts are still airborne. */
export function displayedCount(trueCount: number, inFlightCount: number): number {
  return Math.max(0, trueCount - inFlightCount);
}

/** A rect is usable as a landing target only if it is finite, has area, and
 *  overlaps the window. A degenerate measurement must degrade to the instant
 *  badge path - a ghost flying to (0,0) is worse than no ghost at all.
 *
 *  Note this does NOT catch every wrong-but-well-formed rect: a header-local
 *  (0, 0, 40, 40) looks perfectly valid. Measuring at tap time is what makes
 *  the target correct; this is only the floor under it. */
export function isPlausibleTarget(rect: Rect): boolean {
  const { x, y, width, height } = rect;
  if (![x, y, width, height].every((v) => typeof v === 'number' && Number.isFinite(v))) return false;
  if (width <= 0 || height <= 0) return false;
  const window = Dimensions.get('window');
  return x + width > 0 && y + height > 0 && x < window.width && y < window.height;
}

/** The measurable surface of a cart badge. Narrowed to what we actually call
 *  so tests can register a fake node without a real host component. */
export type CartNode = Pick<View, 'measureInWindow'>;

interface FlightContextValue {
  flights: Flight[];
  /** Starts a ghost flight if (and only if) the animation is active and the
   *  registered badge measures to a plausible rect. Every failure degrades
   *  silently to the instant badge path; callers never need to care. */
  startFlight: (source: Rect, coverUrl: string | null) => void;
  completeFlight: (id: number) => void;
  /** Badges register themselves on mount and unregister on unmount. The most
   *  recently mounted one is the target - on a native stack that is always the
   *  topmost screen's badge, and popping restores the one beneath. */
  registerCartNode: (node: CartNode) => void;
  unregisterCartNode: (node: CartNode) => void;
  /** True when ghosts should fly: flag on, reduced motion off. */
  animationActive: boolean;
}

const FlightContext = createContext<FlightContextValue | null>(null);

interface ProviderProps {
  children: ReactNode;
  /** Override for tests; defaults to the compile-time feature flag. */
  enabled?: boolean;
}

export function FlightProvider({ children, enabled = FEATURE_FLYING_CART }: ProviderProps) {
  const [state, dispatch] = useReducer(flightReducer, initialFlightState);
  const [reduceMotion, setReduceMotion] = useState(false);
  // A stack, not a single ref: a native stack keeps Home mounted underneath
  // Book Details, so two badges are alive at once. Last mounted wins.
  const cartNodes = useRef<CartNode[]>([]);

  // Reduced motion is respected live: flip it in OS settings mid-session and
  // the next add takes the instant path.
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((isEnabled) => {
      if (mounted && typeof isEnabled === 'boolean') setReduceMotion(isEnabled);
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  const animationActive = enabled && !reduceMotion;

  const startFlight = useCallback(
    (source: Rect, coverUrl: string | null): void => {
      if (!animationActive) return;
      // The visible badge is the last one mounted. No badge (or a node the test
      // renderer cannot measure) → degrade to the instant path.
      const node = cartNodes.current.at(-1);
      if (node === undefined || typeof node.measureInWindow !== 'function') return;
      node.measureInWindow((x, y, width, height) => {
        const target = { x, y, width, height };
        if (!isPlausibleTarget(target)) return;
        dispatch({ type: 'started', source, target, coverUrl });
      });
    },
    [animationActive],
  );

  const completeFlight = useCallback((id: number) => dispatch({ type: 'landed', id }), []);

  const registerCartNode = useCallback((node: CartNode) => {
    cartNodes.current.push(node);
  }, []);

  const unregisterCartNode = useCallback((node: CartNode) => {
    cartNodes.current = cartNodes.current.filter((candidate) => candidate !== node);
  }, []);

  const value = useMemo(
    () => ({
      flights: state.flights,
      startFlight,
      completeFlight,
      registerCartNode,
      unregisterCartNode,
      animationActive,
    }),
    [
      state.flights,
      startFlight,
      completeFlight,
      registerCartNode,
      unregisterCartNode,
      animationActive,
    ],
  );

  return <FlightContext.Provider value={value}>{children}</FlightContext.Provider>;
}

export function useFlightController(): FlightContextValue {
  const context = useContext(FlightContext);
  if (context === null) {
    throw new Error('useFlightController must be used inside <FlightProvider>');
  }
  return context;
}

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
import { AccessibilityInfo } from 'react-native';

import { FEATURE_FLYING_CART } from '../config/featureFlags';

// The JS-side brain of the flying-cart animation. Everything here is plain
// React state — the per-frame motion lives in FlyingCartOverlay worklets.
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

interface FlightContextValue {
  flights: Flight[];
  /** Starts a ghost flight if (and only if) the animation is active. Returns
   *  whether a flight actually started — callers never need to care. */
  startFlight: (source: Rect, coverUrl: string | null) => boolean;
  completeFlight: (id: number) => void;
  registerCartTarget: (rect: Rect) => void;
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
  const cartTarget = useRef<Rect | null>(null);

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
    (source: Rect, coverUrl: string | null): boolean => {
      // No target yet (badge never laid out) → degrade to the instant path.
      if (!animationActive || cartTarget.current === null) return false;
      dispatch({ type: 'started', source, target: cartTarget.current, coverUrl });
      return true;
    },
    [animationActive],
  );

  const completeFlight = useCallback((id: number) => dispatch({ type: 'landed', id }), []);
  const registerCartTarget = useCallback((rect: Rect) => {
    cartTarget.current = rect;
  }, []);

  const value = useMemo(
    () => ({
      flights: state.flights,
      startFlight,
      completeFlight,
      registerCartTarget,
      animationActive,
    }),
    [state.flights, startFlight, completeFlight, registerCartTarget, animationActive],
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

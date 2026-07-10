import { useCallback, useEffect } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import {
  FLIGHT_DURATION_MS,
  GHOST_END_SCALE,
  GHOST_FADE_START,
  GHOST_X_EASE_EXPONENT,
  GHOST_Y_EASE_EXPONENT,
} from './animation.constants';
import { Flight, useFlightController } from './flightController';
import { DEBUG_ANIM_RECTS } from '../config/featureFlags';
import { colors } from '../theme/theme';

// ── Animated values and their drivers ──────────────────────────────────────
// One ghost = one `progress` SharedValue, 0 → 1, driven by a single linear
// withTiming over FLIGHT_DURATION_MS. Everything else derives from it INSIDE
// the worklet, per frame, on the UI thread:
//   translateX = dx · easeOut(progress)   (fast start — x leads)
//   translateY = dy · easeIn(progress)    (late dive — y lags)   → the arc
//   scale      = 1 → GHOST_END_SCALE, linear in progress
//   opacity    = 1 until GHOST_FADE_START, then linear to 0
// No setState per frame anywhere. `runOnJS` appears exactly once: in the
// terminal withTiming callback, to remove the landed flight from JS state.
// Stale-closure guard: each Ghost derives dx/dy from ITS OWN flight prop —
// two overlapping ghosts can never share a destination closure.
// ────────────────────────────────────────────────────────────────────────────

function Ghost({ flight, onLand }: { flight: Flight; onLand: (id: number) => void }) {
  const progress = useSharedValue(0);
  const { id, source, target, coverUrl } = flight;

  useEffect(() => {
    progress.value = withTiming(
      1,
      { duration: FLIGHT_DURATION_MS, easing: Easing.linear },
      () => {
        // Terminal callback — the ONLY runOnJS in the animation. Runs whether
        // the timing finished or was cancelled: removal by id is idempotent
        // and a cancelled ghost must not leak either.
        runOnJS(onLand)(id);
      },
    );
    // progress/onLand/id are stable for the life of a ghost (a Flight is
    // immutable; ghosts unmount instead of updating).
  }, [progress, onLand, id]);

  const animatedStyle = useAnimatedStyle(() => {
    const t = progress.value;
    // Decoupled axis easings, computed in-worklet.
    const easeOutT = 1 - Math.pow(1 - t, GHOST_X_EASE_EXPONENT);
    const easeInT = Math.pow(t, GHOST_Y_EASE_EXPONENT);
    const dx = target.x + target.width / 2 - (source.x + source.width / 2);
    const dy = target.y + target.height / 2 - (source.y + source.height / 2);
    const opacity =
      t < GHOST_FADE_START ? 1 : Math.max(0, 1 - (t - GHOST_FADE_START) / (1 - GHOST_FADE_START));
    return {
      transform: [
        { translateX: dx * easeOutT },
        { translateY: dy * easeInT },
        { scale: 1 + (GHOST_END_SCALE - 1) * t },
      ],
      opacity,
    };
  });

  return (
    <Animated.View
      testID={`flying-ghost-${id}`}
      style={[
        styles.ghost,
        {
          left: source.x,
          top: source.y,
          width: source.width,
          height: source.height,
        },
        animatedStyle,
      ]}
    >
      {coverUrl !== null ? (
        <Image source={{ uri: coverUrl }} style={styles.ghostImage} resizeMode="cover" />
      ) : (
        <View style={[styles.ghostImage, styles.ghostFallback]} />
      )}
    </Animated.View>
  );
}

function DebugRects({ flights }: { flights: Flight[] }) {
  const last = flights[flights.length - 1];
  if (last === undefined) return null;
  return (
    <>
      <View
        style={[
          styles.debugRect,
          styles.debugSource,
          {
            left: last.source.x,
            top: last.source.y,
            width: last.source.width,
            height: last.source.height,
          },
        ]}
      >
        <Text style={styles.debugLabel}>src</Text>
      </View>
      <View
        style={[
          styles.debugRect,
          styles.debugTarget,
          {
            left: last.target.x,
            top: last.target.y,
            width: last.target.width,
            height: last.target.height,
          },
        ]}
      >
        <Text style={styles.debugLabel}>dst</Text>
      </View>
    </>
  );
}

/**
 * Mounted ONCE at the app root as a sibling of the NavigationContainer —
 * never inside a screen or FlatList, which would clip ghosts at their bounds
 * (the classic way this feature ships broken). pointerEvents="none": the
 * overlay can never block a tap.
 */
export default function FlyingCartOverlay() {
  const { flights, completeFlight } = useFlightController();
  const onLand = useCallback((id: number) => completeFlight(id), [completeFlight]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {flights.map((flight) => (
        <Ghost key={flight.id} flight={flight} onLand={onLand} />
      ))}
      {__DEV__ && DEBUG_ANIM_RECTS && <DebugRects flights={flights} />}
    </View>
  );
}

const styles = StyleSheet.create({
  ghost: { position: 'absolute' },
  ghostImage: { width: '100%', height: '100%', borderRadius: 6 },
  ghostFallback: { backgroundColor: colors.primary },
  debugRect: { position: 'absolute', borderWidth: 2 },
  debugSource: { borderColor: 'red' },
  debugTarget: { borderColor: 'lime' },
  debugLabel: { fontSize: 10, color: 'red' },
});

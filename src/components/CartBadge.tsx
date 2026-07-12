import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

import { BADGE_POP_LEG_MS, BADGE_POP_SCALE } from '../animation/animation.constants';
import { displayedCount, useFlightController } from '../animation/flightController';
import { cartItemCount, useCartStore } from '../store/cartStore';
import { colors, radii, spacing, type } from '../theme/theme';

// Header cart icon + count badge; also the flying animation's landing target.
//
// The count shown is the DISPLAYED count: true store count minus ghosts still
// in the air - the number increments when a ghost lands, not on tap (the
// store itself updated on tap; this is presentation lag only). With the
// feature flag off or reduced motion on there are never ghosts, so the badge
// tracks the store instantly. The pop animation runs on the UI thread via a
// shared value; JS only decides WHEN to pop.

interface Props {
  onPress: () => void;
}

export default function CartBadge({ onPress }: Props) {
  const trueCount = useCartStore((state) => cartItemCount(state.lines));
  const { flights, registerCartNode, unregisterCartNode } = useFlightController();
  const shown = displayedCount(trueCount, flights.length);

  const containerRef = useRef<View>(null);
  const scale = useSharedValue(1);
  const previousShown = useRef(shown);

  // Register the NODE, not a measured rect. The controller measures it at tap
  // time, by which point a header hosted in the native stack has settled - an
  // onLayout measurement here fires mid-push-transition and reports
  // header-local coordinates. Cleanup on unmount is what lets the badge
  // underneath (Home's, still mounted) reclaim the target when Details pops.
  useEffect(() => {
    const node = containerRef.current;
    if (node === null) return;
    registerCartNode(node);
    return () => unregisterCartNode(node);
  }, [registerCartNode, unregisterCartNode]);

  useEffect(() => {
    if (shown > previousShown.current) {
      scale.value = withSequence(
        withTiming(BADGE_POP_SCALE, { duration: BADGE_POP_LEG_MS }),
        withTiming(1, { duration: BADGE_POP_LEG_MS }),
      );
    }
    previousShown.current = shown;
  }, [shown, scale]);

  return (
    <Pressable
      ref={containerRef}
      accessibilityRole="button"
      accessibilityLabel={`Open cart, ${shown} ${shown === 1 ? 'item' : 'items'}`}
      onPress={onPress}
      hitSlop={spacing.sm}
      style={styles.container}
    >
      <Ionicons name="bag-outline" size={20} color={colors.primary} />
      {shown > 0 && (
        <Animated.View style={[styles.badge, { transform: [{ scale }] }]}>
          <Text style={styles.badgeText}>{shown > 99 ? '99+' : shown}</Text>
        </Animated.View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // A tan disc, matching the avatar on the other end of the header row. Its
  // bounds are what the controller measures at tap time, so the ghost lands on
  // the disc rather than on an invisible padding box.
  container: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    backgroundColor: colors.tan,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: 18,
    height: 18,
    borderRadius: radii.pill,
    backgroundColor: colors.badge,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    // Rings the badge in the header colour so it reads as detached from the disc.
    borderWidth: 2,
    borderColor: colors.background,
  },
  badgeText: { ...type.caption, fontSize: 10, fontWeight: '700', color: colors.surface },
});

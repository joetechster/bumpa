import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

import { BADGE_POP_LEG_MS, BADGE_POP_SCALE } from '../animation/animation.constants';
import { displayedCount, useFlightController } from '../animation/flightController';
import { cartItemCount, useCartStore } from '../store/cartStore';
import { colors, spacing, type } from '../theme/theme';

// Header cart icon + count badge; also the flying animation's landing target.
//
// The count shown is the DISPLAYED count: true store count minus ghosts still
// in the air — the number increments when a ghost lands, not on tap (the
// store itself updated on tap; this is presentation lag only). With the
// feature flag off or reduced motion on there are never ghosts, so the badge
// tracks the store instantly. The pop animation runs on the UI thread via a
// shared value; JS only decides WHEN to pop.

interface Props {
  onPress: () => void;
}

export default function CartBadge({ onPress }: Props) {
  const trueCount = useCartStore((state) => cartItemCount(state.lines));
  const { flights, registerCartTarget } = useFlightController();
  const shown = displayedCount(trueCount, flights.length);

  const containerRef = useRef<View>(null);
  const scale = useSharedValue(1);
  const previousShown = useRef(shown);

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
      onLayout={() => {
        // Register the landing target in window coordinates — the same space
        // measureInWindow reports for sources. Re-registers on every layout
        // change (rotation, header resize).
        containerRef.current?.measureInWindow((x, y, width, height) =>
          registerCartTarget({ x, y, width, height }),
        );
      }}
    >
      <Ionicons name="cart-outline" size={26} color={colors.primary} />
      {shown > 0 && (
        <Animated.View style={[styles.badge, { transform: [{ scale }] }]}>
          <Text style={styles.badgeText}>{shown > 99 ? '99+' : shown}</Text>
        </Animated.View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.xs },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.badge,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { ...type.caption, fontSize: 10, fontWeight: '700', color: colors.background },
});

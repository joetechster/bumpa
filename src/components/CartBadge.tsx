import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { cartItemCount, useCartStore } from '../store/cartStore';
import { colors, spacing, type } from '../theme/theme';

// Header cart icon + count badge. Subscribes via selector so only cart
// changes re-render it — not every store change, not every screen render.
//
// Phase 5 note: this badge will read a *displayed* count that lags the true
// count until the flying ghost lands. Until then it tracks the store directly.

interface Props {
  onPress: () => void;
}

export default function CartBadge({ onPress }: Props) {
  const count = useCartStore((state) => cartItemCount(state.lines));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open cart, ${count} ${count === 1 ? 'item' : 'items'}`}
      onPress={onPress}
      hitSlop={spacing.sm}
      style={styles.container}
    >
      <Ionicons name="cart-outline" size={26} color={colors.primary} />
      {count > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Text>
        </View>
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

import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import PriceTag from '../components/PriceTag';
import QuantityStepper from '../components/QuantityStepper';
import { lineTotalKobo } from '../domain/money';
import type { RootStackParamList } from '../navigation/types';
import { CartLine, cartTotalKobo, useCartStore } from '../store/cartStore';
import { colors, radii, spacing, type } from '../theme/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Cart'>;

export default function CartScreen({ navigation }: Props) {
  const lines = useCartStore((s) => s.lines);
  const hydrated = useCartStore((s) => s.hydrated);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const removeBook = useCartStore((s) => s.removeBook);

  // Until rehydration settles we don't know if the cart is empty — render
  // nothing cart-shaped rather than flashing "Your cart is empty".
  if (!hydrated) {
    return <View style={styles.container} />;
  }

  if (lines.length === 0) {
    return (
      <View style={[styles.container, styles.empty]}>
        <Text style={styles.emptyTitle}>Your cart is empty</Text>
        <Text style={styles.emptyDetail}>Books you add will show up here.</Text>
      </View>
    );
  }

  const totalKobo = cartTotalKobo(lines);

  const renderLine = ({ item }: { item: CartLine }) => (
    <View style={styles.line}>
      {item.book.coverUrl !== null ? (
        <Image source={{ uri: item.book.coverUrl }} style={styles.cover} resizeMode="cover" />
      ) : (
        <View style={[styles.cover, styles.coverFallback]} />
      )}
      <View style={styles.lineInfo}>
        <Text style={styles.lineTitle} numberOfLines={2}>
          {item.book.title}
        </Text>
        <PriceTag priceKobo={lineTotalKobo(item.book.priceKobo, item.quantity)} />
        <View style={styles.lineControls}>
          <QuantityStepper
            quantity={item.quantity}
            itemLabel={item.book.title}
            onChange={(quantity) => setQuantity(item.book.id, quantity)}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Remove ${item.book.title} from cart`}
            onPress={() => removeBook(item.book.id)}
            hitSlop={spacing.xs}
          >
            <Text style={styles.remove}>Remove</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={lines}
        keyExtractor={(line) => line.book.id}
        renderItem={renderLine}
        contentContainerStyle={styles.listContent}
      />
      <View style={styles.summary}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <PriceTag priceKobo={totalKobo} size="large" />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Proceed to checkout"
          onPress={() => navigation.navigate('Checkout')}
          style={({ pressed }) => [styles.checkoutButton, pressed && styles.pressed]}
        >
          <Text style={styles.checkoutText}>Checkout</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  empty: { alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  emptyTitle: { ...type.heading, color: colors.text },
  emptyDetail: { ...type.body, color: colors.textMuted },
  listContent: { padding: spacing.md, gap: spacing.sm },
  line: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.sm,
  },
  cover: { width: 56, height: 84, borderRadius: radii.sm, backgroundColor: colors.border },
  coverFallback: {},
  lineInfo: { flex: 1, gap: spacing.xs },
  lineTitle: { ...type.body, fontWeight: '600', color: colors.text },
  lineControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  remove: { ...type.caption, color: colors.danger, fontWeight: '600' },
  summary: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.background,
  },
  totalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  totalLabel: { ...type.heading, color: colors.text },
  checkoutButton: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  pressed: { opacity: 0.7 },
  checkoutText: { ...type.body, fontWeight: '700', color: colors.background },
});

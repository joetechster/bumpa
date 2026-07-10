import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, type } from '../theme/theme';

// Decrementing at quantity 1 removes the line (D21, PROVISIONAL) — the parent
// decides by receiving the new quantity (0 = remove, handled by the store).

interface Props {
  quantity: number;
  onChange: (newQuantity: number) => void;
  itemLabel: string; // for accessibility: "Increase quantity of Ficciones"
}

export default function QuantityStepper({ quantity, onChange, itemLabel }: Props) {
  return (
    <View style={styles.container}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          quantity === 1 ? `Remove ${itemLabel} from cart` : `Decrease quantity of ${itemLabel}`
        }
        onPress={() => onChange(quantity - 1)}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        hitSlop={spacing.xs}
      >
        <Text style={styles.buttonText}>−</Text>
      </Pressable>
      <Text style={styles.quantity} accessibilityLabel={`Quantity: ${quantity}`}>
        {quantity}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Increase quantity of ${itemLabel}`}
        onPress={() => onChange(quantity + 1)}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        hitSlop={spacing.xs}
      >
        <Text style={styles.buttonText}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  button: {
    width: 28,
    height: 28,
    borderRadius: radii.sm,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.6 },
  buttonText: { ...type.body, fontWeight: '700', color: colors.text },
  quantity: { ...type.body, minWidth: 20, textAlign: 'center', color: colors.text },
});

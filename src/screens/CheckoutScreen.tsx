import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, type } from '../theme/theme';

// Placeholder — Paystack checkout arrives in Phase 6.
export default function CheckoutScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Checkout</Text>
      <Text style={styles.caption}>Paystack checkout (coming in Phase 6)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    gap: spacing.sm,
  },
  heading: { ...type.heading, color: colors.text },
  caption: { ...type.caption, color: colors.textMuted },
});

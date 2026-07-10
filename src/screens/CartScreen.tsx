import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, type } from '../theme/theme';

// Placeholder — real cart arrives in Phase 4.
export default function CartScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Your cart</Text>
      <Text style={styles.caption}>Cart is empty (coming in Phase 4)</Text>
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

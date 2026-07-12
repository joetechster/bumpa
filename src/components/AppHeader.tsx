import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import CartBadge from './CartBadge';
import { colors, radii, spacing, type } from '../theme/theme';

// Home's chrome, replacing the native stack header (which cannot do the serif
// display title over an avatar row). CartBadge is rendered HERE on Home and by
// the native header everywhere else - it re-registers itself as the flying
// cart's landing target on every layout, so it can live in either without the
// animation caring.
//
// The avatar is a placeholder glyph, not a photo: the app has no accounts, and
// a stock face would imply a signed-in user that does not exist.

interface Props {
  title: string;
  onCartPress: () => void;
}

export default function AppHeader({ title, onCartPress }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.row}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={18} color={colors.primary} />
        </View>
        <CartBadge onPress={onCartPress} />
      </View>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.background,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    backgroundColor: colors.tan,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...type.display, color: colors.text, marginTop: spacing.md },
});

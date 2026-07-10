import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StyleSheet, Text, View } from 'react-native';

import type { RootStackParamList } from '../navigation/types';
import { colors, spacing, type } from '../theme/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'BookDetails'>;

// Placeholder — consumes the Phase 3 fetch hook from Phase 4 onwards.
export default function BookDetailsScreen({ route }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Book details</Text>
      <Text style={styles.caption}>Book id: {route.params.bookId}</Text>
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

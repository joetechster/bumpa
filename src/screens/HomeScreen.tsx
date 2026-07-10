import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, StyleSheet, Text, View } from 'react-native';

import type { RootStackParamList } from '../navigation/types';
import { colors, spacing, type } from '../theme/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

// Placeholder — replaced with browse/search/pagination in Phase 4.
export default function HomeScreen({ navigation }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>The Book Nook</Text>
      <Text style={styles.caption}>Browse books (coming in Phase 4)</Text>
      <Button title="Open cart" onPress={() => navigation.navigate('Cart')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    gap: spacing.md,
  },
  title: { ...type.title, color: colors.text },
  caption: { ...type.caption, color: colors.textMuted },
});

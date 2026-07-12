import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, type } from '../theme/theme';

// Empty results are a SUCCESS state (D11) - this view must never look like an
// error. Distinct copy, no retry affordance.
interface Props {
  query: string;
}

export default function EmptyView({ query }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>No books found</Text>
      <Text style={styles.detail}>
        Nothing on the shelf for “{query}”. Try a different title or author.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.sm },
  title: { ...type.heading, color: colors.text },
  detail: { ...type.body, color: colors.textMuted, textAlign: 'center' },
});

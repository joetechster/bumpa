import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { ApiError } from '../api/errors';
import { colors, radii, spacing, type } from '../theme/theme';

// The four error UIs (D11). rate_limit and server must read differently — a
// 429 tells the user to wait, a 500 says it's not their fault. malformed
// shares the server copy by design.
function copyFor(error: ApiError): { title: string; detail: string } {
  switch (error.kind) {
    case 'network':
      return {
        title: 'You appear to be offline',
        detail:
          error.cause === 'timeout'
            ? 'The request took too long. Check your connection and try again.'
            : 'Check your internet connection and try again.',
      };
    case 'rate_limit':
      return {
        title: 'Too many requests',
        detail:
          error.retryAfterSeconds !== null
            ? `The book service asked us to slow down. Try again in ${error.retryAfterSeconds}s.`
            : 'The book service asked us to slow down. Give it a moment, then retry.',
      };
    case 'not_found':
      return {
        title: 'Book not found',
        detail: 'This book seems to have left the shelf. It may have been removed upstream.',
      };
    case 'server':
    case 'malformed':
      return {
        title: 'Something went wrong on our side',
        detail: 'The book service had a problem. This is not your fault — please try again.',
      };
  }
}

interface Props {
  error: ApiError;
  onRetry?: () => void;
}

export default function ErrorView({ error, onRetry }: Props) {
  const { title, detail } = copyFor(error);
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.detail}>{detail}</Text>
      {onRetry !== undefined && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Try again"
          onPress={onRetry}
          style={({ pressed }) => [styles.retry, pressed && styles.pressed]}
        >
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.sm },
  title: { ...type.heading, color: colors.text, textAlign: 'center' },
  detail: { ...type.body, color: colors.textMuted, textAlign: 'center' },
  retry: {
    marginTop: spacing.sm,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
  },
  pressed: { opacity: 0.7 },
  retryText: { ...type.body, color: colors.background, fontWeight: '600' },
});

import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { colors, spacing } from '../theme/theme';

const STARS = [1, 2, 3, 4, 5];

interface Props {
  /** 0–5. Rounded to the nearest whole star for display. */
  rating: number;
  size?: number;
}

// Five stars, filled to the nearest whole. The precise value stays in the
// accessibility label - a screen reader gets "4.3 out of 5", not "four stars",
// because rounding is a drawing decision, not a data one.
export default function StarRating({ rating, size = 16 }: Props) {
  const filled = Math.round(rating);

  return (
    <View
      style={styles.row}
      accessibilityLabel={`Rated ${rating.toFixed(1)} out of 5`}
      accessibilityRole="image"
    >
      {STARS.map((star) => (
        <Ionicons
          key={star}
          name={star <= filled ? 'star' : 'star-outline'}
          size={size}
          color={star <= filled ? colors.accent : colors.border}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.xs / 2 },
});

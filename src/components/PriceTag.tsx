import { StyleSheet, Text } from 'react-native';

import { formatNaira } from '../domain/money';
import { colors, type } from '../theme/theme';

interface Props {
  /** Integer kobo. null renders an em-dash placeholder (price unavailable). */
  priceKobo: number | null;
  size?: 'body' | 'large';
}

export default function PriceTag({ priceKobo, size = 'body' }: Props) {
  return (
    <Text
      style={[styles.price, size === 'large' && styles.large]}
      accessibilityLabel={priceKobo === null ? 'Price unavailable' : formatNaira(priceKobo)}
    >
      {priceKobo === null ? '—' : formatNaira(priceKobo)}
    </Text>
  );
}

const styles = StyleSheet.create({
  price: { ...type.price, color: colors.primaryDark },
  large: { fontSize: 22 },
});

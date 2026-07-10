import { memo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import PriceTag from './PriceTag';
import type { Book } from '../domain/book';
import { colors, radii, spacing, type } from '../theme/theme';

export const BOOK_CARD_HEIGHT = 116; // fixed → FlatList getItemLayout (Phase 8)

interface Props {
  book: Book;
  onPress: (book: Book) => void;
  onAddToCart: (book: Book) => void;
}

function BookCard({ book, onPress, onAddToCart }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${book.title}, view details`}
      onPress={() => onPress(book)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      {book.coverUrl !== null ? (
        <Image source={{ uri: book.coverUrl }} style={styles.cover} resizeMode="cover" />
      ) : (
        <View style={[styles.cover, styles.coverFallback]}>
          <Text style={styles.coverFallbackText} numberOfLines={3}>
            {book.title}
          </Text>
        </View>
      )}
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>
          {book.title}
        </Text>
        <Text style={styles.author} numberOfLines={1}>
          {book.authors.length > 0 ? book.authors.join(', ') : 'Unknown author'}
        </Text>
        <Text style={styles.rating}>★ {book.rating.toFixed(1)}</Text>
        <View style={styles.bottomRow}>
          <PriceTag priceKobo={book.priceKobo} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Add ${book.title} to cart`}
            onPress={() => onAddToCart(book)}
            style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
            hitSlop={spacing.sm}
          >
            <Text style={styles.addButtonText}>Add to cart</Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

// memo: rows are pure functions of the book + stable handlers; without it the
// whole window re-renders on every keystroke of the search box.
export default memo(BookCard);

const styles = StyleSheet.create({
  card: {
    height: BOOK_CARD_HEIGHT,
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.sm,
    marginHorizontal: spacing.md,
    marginVertical: spacing.xs,
    gap: spacing.sm,
  },
  pressed: { opacity: 0.75 },
  cover: { width: 64, height: '100%', borderRadius: radii.sm, backgroundColor: colors.border },
  coverFallback: { alignItems: 'center', justifyContent: 'center', padding: spacing.xs },
  coverFallbackText: { ...type.caption, color: colors.textMuted, textAlign: 'center' },
  info: { flex: 1, justifyContent: 'space-between' },
  title: { ...type.body, fontWeight: '600', color: colors.text },
  author: { ...type.caption, color: colors.textMuted },
  rating: { ...type.caption, color: colors.accent },
  bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  addButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
  },
  addButtonText: { ...type.caption, fontWeight: '600', color: colors.background },
});

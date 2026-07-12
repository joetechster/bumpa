import { Ionicons } from '@expo/vector-icons';
import { RefObject, memo, useRef } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import type { Book } from '../domain/book';
import { colors, radii, shadows, spacing, type } from '../theme/theme';

export const COVER_CARD_WIDTH = 132;
const COVER_HEIGHT = 190;

interface Props {
  book: Book;
  onPress: (book: Book) => void;
  /** coverRef points at the cover element - the flying ghost's source rect. */
  onAddToCart: (book: Book, coverRef: RefObject<View | null>) => void;
}

// A shelf item: cover-first, the way the reference leads. The ⊕ button is an
// addition to the reference - without it the home screen has no way to add a
// book, and the flying-cart animation would be unreachable from the first
// screen a reviewer sees.
function CoverCard({ book, onPress, onAddToCart }: Props) {
  const coverRef = useRef<View>(null);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${book.title}, view details`}
      onPress={() => onPress(book)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      {/* collapsable={false} keeps this View in the native tree so
          measureInWindow can find it - without it Android may flatten it away
          and the flight silently never starts. */}
      <View ref={coverRef} collapsable={false} style={styles.cover}>
        {book.coverUrl !== null ? (
          <Image source={{ uri: book.coverUrl }} style={styles.coverImage} resizeMode="cover" />
        ) : (
          <View style={[styles.coverImage, styles.coverFallback]}>
            <Text style={styles.coverFallbackText} numberOfLines={4}>
              {book.title}
            </Text>
          </View>
        )}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Add ${book.title} to cart`}
        onPress={() => onAddToCart(book, coverRef)}
        style={({ pressed }) => [styles.addButton, pressed && styles.pressedButton]}
        hitSlop={spacing.sm}
      >
        <Ionicons name="add" size={18} color={colors.surface} />
      </Pressable>
      <Text style={styles.title} numberOfLines={1}>
        {book.title}
      </Text>
      <Text style={styles.author} numberOfLines={1}>
        {book.authors.length > 0 ? book.authors.join(', ') : 'Unknown author'}
      </Text>
    </Pressable>
  );
}

// memo for the same reason BookCard is memo'd: a rail re-renders on every
// keystroke of the search box otherwise.
export default memo(CoverCard);

const styles = StyleSheet.create({
  card: { width: COVER_CARD_WIDTH, marginRight: spacing.md },
  pressed: { opacity: 0.85 },
  cover: { width: '100%', height: COVER_HEIGHT },
  coverImage: {
    width: '100%',
    height: '100%',
    borderRadius: radii.md,
    backgroundColor: colors.tan,
    ...shadows.card,
  },
  coverFallback: { alignItems: 'center', justifyContent: 'center', padding: spacing.sm },
  coverFallbackText: { ...type.caption, color: colors.text, textAlign: 'center' },
  addButton: {
    position: 'absolute',
    // Straddles the cover's bottom-right corner.
    top: COVER_HEIGHT - 16,
    right: -6,
    width: 32,
    height: 32,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  pressedButton: { opacity: 0.7 },
  title: { ...type.heading, fontSize: 15, color: colors.text, marginTop: spacing.sm },
  author: { ...type.caption, color: colors.textMuted, marginTop: 2 },
});

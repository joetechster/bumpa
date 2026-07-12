import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useRef } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useFlyToCart } from '../animation/useFlyToCart';
import { getBookById } from '../api/books';
import ErrorView from '../components/ErrorView';
import PriceTag from '../components/PriceTag';
import StarRating from '../components/StarRating';
import { useFetch } from '../hooks/useFetch';
import type { RootStackParamList } from '../navigation/types';
import { useCartStore } from '../store/cartStore';
import { colors, radii, shadows, spacing, type } from '../theme/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'BookDetails'>;

// The subject pills cycle through three tints so a row of them reads as
// decoration rather than as a set of categories with meaning attached to colour.
const PILL_TINTS = [colors.tan, colors.blush, colors.sage];

export default function BookDetailsScreen({ route }: Props) {
  const { bookId } = route.params;

  // Keyed by bookId: navigating to another book aborts this request and the
  // stale response can never land (see useFetch's race guard).
  const fetchBook = useCallback(
    (signal: AbortSignal) => getBookById(bookId, { signal }),
    [bookId],
  );
  const { state, retry } = useFetch(fetchBook);
  const addBook = useCartStore((s) => s.addBook);
  const flyToCart = useFlyToCart();
  const coverRef = useRef<View>(null);

  if (state.status === 'loading' || state.status === 'idle') {
    return <ActivityIndicator accessibilityLabel="Loading book details" style={styles.spinner} />;
  }
  if (state.status === 'error') {
    return <ErrorView error={state.error} onRetry={retry} />;
  }

  const book = state.data;
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Hero: the cover floats on a deeper panel, which is what gives the
          reference its sense of a book lying on a table. */}
      <View style={styles.hero}>
        <View ref={coverRef} collapsable={false} style={styles.coverWrap}>
          {book.coverUrl !== null ? (
            <Image
              source={{ uri: book.coverUrl }}
              style={styles.cover}
              resizeMode="cover"
              accessibilityLabel={`Cover of ${book.title}`}
            />
          ) : (
            <View style={[styles.cover, styles.coverFallback]}>
              <Text style={styles.coverFallbackText}>{book.title}</Text>
            </View>
          )}
        </View>
        <Text style={styles.title}>{book.title}</Text>
        <Text style={styles.author}>
          {book.authors.length > 0 ? book.authors.join(', ') : 'Unknown author'}
        </Text>
        <StarRating rating={book.rating} size={18} />
      </View>

      <View style={styles.body}>
        <View style={styles.descriptionRow}>
          <Text style={styles.sectionTitle}>Description</Text>
          <PriceTag priceKobo={book.priceKobo} size="large" />
        </View>
        {book.firstPublishYear !== null && (
          <Text style={styles.meta}>First published {book.firstPublishYear}</Text>
        )}
        {book.description !== null && <Text style={styles.description}>{book.description}</Text>}

        {book.subjects.length > 0 && (
          <View style={styles.subjects}>
            {book.subjects.slice(0, 6).map((subject, index) => (
              <Text
                key={subject}
                style={[styles.subject, { backgroundColor: PILL_TINTS[index % PILL_TINTS.length] }]}
              >
                {subject}
              </Text>
            ))}
          </View>
        )}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Add ${book.title} to cart`}
          onPress={() => {
            addBook(book); // store first, always - the flight is decorative
            flyToCart(coverRef, book.coverUrl);
          }}
          style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
        >
          <Text style={styles.addButtonText}>Add to cart</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: spacing.xl },
  spinner: { marginTop: spacing.xl },
  hero: {
    alignItems: 'center',
    backgroundColor: colors.cardDeep,
    borderRadius: radii.xl,
    marginHorizontal: spacing.md,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  coverWrap: { marginBottom: spacing.md },
  cover: {
    width: 150,
    height: 220,
    borderRadius: radii.md,
    backgroundColor: colors.tan,
    ...shadows.hero,
  },
  coverFallback: { alignItems: 'center', justifyContent: 'center', padding: spacing.sm },
  coverFallbackText: { ...type.body, color: colors.text, textAlign: 'center' },
  title: { ...type.title, color: colors.text, textAlign: 'center' },
  author: { ...type.body, color: colors.textMuted },
  body: { padding: spacing.md, gap: spacing.sm },
  descriptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  sectionTitle: { ...type.heading, color: colors.text },
  meta: { ...type.caption, color: colors.textMuted },
  description: { ...type.body, color: colors.text, lineHeight: 22 },
  subjects: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.sm },
  subject: {
    ...type.caption,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    overflow: 'hidden', // iOS: a Text's own borderRadius won't clip without this
  },
  addButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
    alignItems: 'center',
    marginTop: spacing.lg,
    ...shadows.card,
  },
  pressed: { opacity: 0.7 },
  addButtonText: { ...type.body, fontWeight: '600', color: colors.surface },
});

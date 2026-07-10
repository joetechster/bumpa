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
import { useFetch } from '../hooks/useFetch';
import type { RootStackParamList } from '../navigation/types';
import { useCartStore } from '../store/cartStore';
import { colors, radii, spacing, type } from '../theme/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'BookDetails'>;

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
      <View ref={coverRef} collapsable={false}>
        {book.coverUrl !== null ? (
          <Image
            source={{ uri: book.coverUrl }}
            style={styles.cover}
            resizeMode="contain"
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
      <Text style={styles.rating}>★ {book.rating.toFixed(1)}</Text>
      <PriceTag priceKobo={book.priceKobo} size="large" />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Add ${book.title} to cart`}
        onPress={() => {
          addBook(book); // store first, always — the flight is decorative
          flyToCart(coverRef, book.coverUrl);
        }}
        style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
      >
        <Text style={styles.addButtonText}>Add to cart</Text>
      </Pressable>
      {book.description !== null && <Text style={styles.description}>{book.description}</Text>}
      {book.subjects.length > 0 && (
        <View style={styles.subjects}>
          {book.subjects.slice(0, 6).map((subject) => (
            <Text key={subject} style={styles.subject}>
              {subject}
            </Text>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.sm, alignItems: 'center' },
  spinner: { marginTop: spacing.xl },
  cover: { width: 160, height: 240, borderRadius: radii.md, backgroundColor: colors.border },
  coverFallback: { alignItems: 'center', justifyContent: 'center', padding: spacing.sm },
  coverFallbackText: { ...type.body, color: colors.textMuted, textAlign: 'center' },
  title: { ...type.title, color: colors.text, textAlign: 'center' },
  author: { ...type.body, color: colors.textMuted },
  rating: { ...type.body, color: colors.accent },
  addButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    marginVertical: spacing.sm,
  },
  pressed: { opacity: 0.7 },
  addButtonText: { ...type.body, fontWeight: '600', color: colors.background },
  description: { ...type.body, color: colors.text, alignSelf: 'stretch' },
  subjects: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    alignSelf: 'stretch',
    marginTop: spacing.sm,
  },
  subject: {
    ...type.caption,
    color: colors.textMuted,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
  },
});

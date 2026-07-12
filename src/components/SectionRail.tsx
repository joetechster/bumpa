import { RefObject, useCallback } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import CoverCard, { COVER_CARD_WIDTH } from './CoverCard';
import { copyFor } from './ErrorView';
import { searchBooks } from '../api/books';
import { RAIL_SIZE } from '../config/tuning';
import type { Book } from '../domain/book';
import { useFetch } from '../hooks/useFetch';
import { colors, radii, spacing, type } from '../theme/theme';

// One shelf. It owns its own fetch lifecycle via useFetch - abort on unmount,
// stale responses dropped, retry() - so a shelf that fails shows a compact
// inline error and a retry INSIDE its own strip, leaving the rest of the home
// screen intact. Two shelves means two cold-start requests, and Open Library
// rate-limits; a 429 must cost one rail, not the screen.

interface Props {
  title: string;
  query: string;
  onPressBook: (book: Book) => void;
  onAddToCart: (book: Book, coverRef: RefObject<View | null>) => void;
}

export default function SectionRail({ title, query, onPressBook, onAddToCart }: Props) {
  // Keyed by query: useFetch re-runs (and aborts the previous request) when the
  // shelf's query changes, and exhaustive-deps enforces that.
  const fetchShelf = useCallback(
    (signal: AbortSignal) => searchBooks(query, 1, { signal }),
    [query],
  );
  const { state, retry } = useFetch(fetchShelf);

  const renderBody = () => {
    if (state.status === 'idle' || state.status === 'loading') {
      return (
        <View style={styles.row} accessibilityLabel={`Loading ${title}`}>
          {/* Placeholders hold the rail's height so the page doesn't jolt when
              the covers land. */}
          {[0, 1, 2].map((i) => (
            <View key={i} style={styles.skeleton} />
          ))}
        </View>
      );
    }
    if (state.status === 'error') {
      return (
        <View style={styles.error}>
          <Text style={styles.errorText}>{copyFor(state.error).title}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Retry ${title}`}
            onPress={retry}
            style={({ pressed }) => [styles.retry, pressed && styles.pressed]}
            hitSlop={spacing.sm}
          >
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        </View>
      );
    }

    const books = state.data.books.slice(0, RAIL_SIZE);
    if (books.length === 0) {
      return <Text style={styles.errorText}>This shelf is empty right now.</Text>;
    }
    return (
      <FlatList
        data={books}
        keyExtractor={(book) => book.id}
        renderItem={({ item }) => (
          <CoverCard book={item} onPress={onPressBook} onAddToCart={onAddToCart} />
        )}
        horizontal
        showsHorizontalScrollIndicator={false}
        // The rail is RAIL_SIZE items and never grows, so windowing it would
        // cost more than it saves.
        contentContainerStyle={styles.listContent}
      />
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {renderBody()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: spacing.lg },
  title: { ...type.title, color: colors.text, marginHorizontal: spacing.md },
  listContent: { paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.sm },
  row: { flexDirection: 'row', paddingHorizontal: spacing.md, paddingTop: spacing.md },
  skeleton: {
    width: COVER_CARD_WIDTH,
    height: 190,
    borderRadius: radii.md,
    backgroundColor: colors.tan,
    opacity: 0.5,
    marginRight: spacing.md,
  },
  error: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  errorText: { ...type.body, color: colors.textMuted, flexShrink: 1 },
  retry: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
  },
  pressed: { opacity: 0.7 },
  retryText: { ...type.caption, fontWeight: '600', color: colors.surface },
});

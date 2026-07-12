import { RefObject } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';

import BookCard, { BOOK_CARD_HEIGHT } from './BookCard';
import EmptyView from './EmptyView';
import ErrorView from './ErrorView';
import { LIST_INITIAL_NUM_TO_RENDER } from '../config/tuning';
import type { Book } from '../domain/book';
import { useBookSearch } from '../hooks/useBookSearch';
import { colors, spacing, type } from '../theme/theme';

// The paged results list, extracted from HomeScreen so that it - and therefore
// useBookSearch - only exists while the user is actually searching. Mounting
// the hook unconditionally would fire a third cold-start request for
// DEFAULT_BROWSE_QUERY that nothing renders and that duplicates the first
// shelf, on an API that rate-limits. Unmounting is also the cancel: useBookSearch
// aborts its in-flight request on cleanup.

interface Props {
  query: string;
  onPressBook: (book: Book) => void;
  onAddToCart: (book: Book, coverRef: RefObject<View | null>) => void;
}

export default function SearchResults({ query, onPressBook, onAddToCart }: Props) {
  const { state, loadMore, retry } = useBookSearch(query);

  if (state.status === 'loading') {
    return <ActivityIndicator accessibilityLabel="Loading books" style={styles.spinner} />;
  }
  if (state.status === 'error' && state.books.length === 0) {
    return <ErrorView error={state.error} onRetry={retry} />;
  }
  if (state.status === 'success' && state.books.length === 0) {
    return <EmptyView query={state.query} />;
  }

  return (
    <FlatList
      data={state.books}
      keyExtractor={(book) => book.id}
      renderItem={({ item }) => (
        <BookCard book={item} onPress={onPressBook} onAddToCart={onAddToCart} />
      )}
      getItemLayout={(_data, index) => ({
        length: BOOK_CARD_HEIGHT + spacing.xs * 2,
        offset: (BOOK_CARD_HEIGHT + spacing.xs * 2) * index,
        index,
      })}
      initialNumToRender={LIST_INITIAL_NUM_TO_RENDER}
      onEndReached={loadMore}
      onEndReachedThreshold={0.5}
      ListFooterComponent={
        state.status === 'loading-more' ? (
          <ActivityIndicator accessibilityLabel="Loading more books" style={styles.footer} />
        ) : state.status === 'error' ? (
          // Load-more failed but we have results: inline retry, keep the list.
          <View style={styles.footer}>
            <Text style={styles.footerError}>Couldn’t load more books.</Text>
            <Text
              accessibilityRole="button"
              accessibilityLabel="Retry loading more"
              onPress={retry}
              style={styles.footerRetry}
            >
              Retry
            </Text>
          </View>
        ) : null
      }
      contentContainerStyle={styles.listContent}
    />
  );
}

const styles = StyleSheet.create({
  spinner: { marginTop: spacing.xl },
  listContent: { paddingBottom: spacing.lg },
  footer: { paddingVertical: spacing.md, alignItems: 'center', gap: spacing.xs },
  footerError: { ...type.caption, color: colors.textMuted },
  footerRetry: { ...type.body, color: colors.primary, fontWeight: '600' },
});

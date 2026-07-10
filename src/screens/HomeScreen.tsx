import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RefObject, useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useFlyToCart } from '../animation/useFlyToCart';

import BookCard, { BOOK_CARD_HEIGHT } from '../components/BookCard';
import EmptyView from '../components/EmptyView';
import ErrorView from '../components/ErrorView';
import { DEFAULT_BROWSE_QUERY, LIST_INITIAL_NUM_TO_RENDER } from '../config/tuning';
import type { Book } from '../domain/book';
import { useBookSearch } from '../hooks/useBookSearch';
import type { RootStackParamList } from '../navigation/types';
import { useCartStore } from '../store/cartStore';
import { colors, radii, spacing, type } from '../theme/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props) {
  const [input, setInput] = useState('');
  // Empty input browses the default shelf rather than searching for "".
  const { state, loadMore, retry } = useBookSearch(
    input.trim() === '' ? DEFAULT_BROWSE_QUERY : input.trim(),
  );
  const addBook = useCartStore((s) => s.addBook);
  const flyToCart = useFlyToCart();

  const openDetails = useCallback(
    (book: Book) => navigation.navigate('BookDetails', { bookId: book.id, title: book.title }),
    [navigation],
  );

  // The cart updates on tap, FIRST and synchronously — the flight is
  // decorative and every one of its failure modes degrades to "badge just
  // updates instantly". If the animation throws, the cart is still right.
  const handleAddToCart = useCallback(
    (book: Book, coverRef: RefObject<View | null>) => {
      addBook(book);
      flyToCart(coverRef, book.coverUrl);
    },
    [addBook, flyToCart],
  );

  const renderContent = () => {
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
          <BookCard book={item} onPress={openDetails} onAddToCart={handleAddToCart} />
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
  };

  return (
    <View style={styles.container}>
      <TextInput
        value={input}
        onChangeText={setInput}
        placeholder="Search books…"
        placeholderTextColor={colors.textMuted}
        accessibilityLabel="Search books"
        autoCorrect={false}
        returnKeyType="search"
        style={styles.search}
      />
      {renderContent()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  search: {
    ...type.body,
    margin: spacing.md,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.text,
  },
  spinner: { marginTop: spacing.xl },
  listContent: { paddingBottom: spacing.lg },
  footer: { paddingVertical: spacing.md, alignItems: 'center', gap: spacing.xs },
  footerError: { ...type.caption, color: colors.textMuted },
  footerRetry: { ...type.body, color: colors.primary, fontWeight: '600' },
});

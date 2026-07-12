import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RefObject, useCallback, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { useFlyToCart } from '../animation/useFlyToCart';

import AppHeader from '../components/AppHeader';
import SearchResults from '../components/SearchResults';
import SectionRail from '../components/SectionRail';
import { HOME_SECTIONS } from '../config/tuning';
import type { Book } from '../domain/book';
import type { RootStackParamList } from '../navigation/types';
import { useCartStore } from '../store/cartStore';
import { colors, radii, shadows, spacing, type } from '../theme/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

// Two modes, one screen:
//   browsing  (search box empty) → the curated shelves in HOME_SECTIONS
//   searching (search box typed) → the paged results list
//
// They are separate components, not two branches over one hook, so that the
// hook belonging to the hidden mode does not run: SearchResults owns
// useBookSearch and is unmounted while browsing, and each SectionRail owns its
// own fetch and unmounts while searching. Nothing fetches for a screen the user
// cannot see, and switching modes aborts whatever the old mode had in flight.
export default function HomeScreen({ navigation }: Props) {
  const [input, setInput] = useState('');
  const query = input.trim();
  const isSearching = query !== '';

  const addBook = useCartStore((s) => s.addBook);
  const flyToCart = useFlyToCart();

  const openDetails = useCallback(
    (book: Book) => navigation.navigate('BookDetails', { bookId: book.id, title: book.title }),
    [navigation],
  );

  const openCart = useCallback(() => navigation.navigate('Cart'), [navigation]);

  // The cart updates on tap, FIRST and synchronously - the flight is
  // decorative and every one of its failure modes degrades to "badge just
  // updates instantly". If the animation throws, the cart is still right.
  const handleAddToCart = useCallback(
    (book: Book, coverRef: RefObject<View | null>) => {
      addBook(book);
      flyToCart(coverRef, book.coverUrl);
    },
    [addBook, flyToCart],
  );

  return (
    <View style={styles.container}>
      <AppHeader title="The Book Nook" onCartPress={openCart} />
      <View style={styles.searchRow}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
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
      </View>

      {isSearching ? (
        <SearchResults query={query} onPressBook={openDetails} onAddToCart={handleAddToCart} />
      ) : (
        <ScrollView contentContainerStyle={styles.shelves} showsVerticalScrollIndicator={false}>
          {HOME_SECTIONS.map((section) => (
            <SectionRail
              key={section.title}
              title={section.title}
              query={section.query}
              onPressBook={openDetails}
              onAddToCart={handleAddToCart}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    margin: spacing.md,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  search: { ...type.body, flex: 1, paddingVertical: spacing.sm, color: colors.text },
  shelves: { paddingTop: spacing.sm, paddingBottom: spacing.lg },
});

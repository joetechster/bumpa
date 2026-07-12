import { createNativeStackNavigator } from '@react-navigation/native-stack';

import type { RootStackParamList } from './types';
import CartBadge from '../components/CartBadge';
import BookDetailsScreen from '../screens/BookDetailsScreen';
import CartScreen from '../screens/CartScreen';
import CheckoutScreen from '../screens/CheckoutScreen';
import HomeScreen from '../screens/HomeScreen';
import { colors, type } from '../theme/theme';

const Stack = createNativeStackNavigator<RootStackParamList>();

// Several CartBadges are mounted at once, and that is fine. A native stack does
// not unmount Home when Details is pushed, so Home's AppHeader badge stays alive
// beneath the pushed screen's header badge. The flight targets the most recently
// mounted badge (the top of the controller's node stack), which is always the
// visible screen's; popping unregisters it and Home's reclaims the target.
//
// headerRight stays per-screen anyway: a navigator-wide one would still mount
// the header's subviews under Home's `headerShown: false`, giving the topmost
// position to a badge nobody can see.
const cartHeaderRight = (navigate: () => void) => ({
  headerRight: () => <CartBadge onPress={navigate} />,
});

export default function RootNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerTintColor: colors.text,
        headerStyle: { backgroundColor: colors.background },
        // The reference has no hairline under its chrome; the cream canvas is
        // meant to run unbroken from the header into the content.
        headerShadowVisible: false,
        headerTitleStyle: { ...type.heading, color: colors.text },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      {/* Home draws its own chrome (AppHeader): an avatar row and a serif
          display title, which the native header cannot express. AppHeader
          renders the CartBadge, so the flight's landing target exists here too. */}
      <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="BookDetails"
        component={BookDetailsScreen}
        options={({ route, navigation }) => ({
          title: route.params.title ?? 'Book details',
          ...cartHeaderRight(() => navigation.navigate('Cart')),
        })}
      />
      {/* The cart screen IS the cart - no badge to itself. */}
      <Stack.Screen name="Cart" component={CartScreen} options={{ title: 'Your cart' }} />
      <Stack.Screen
        name="Checkout"
        component={CheckoutScreen}
        options={({ navigation }) => ({
          title: 'Checkout',
          ...cartHeaderRight(() => navigation.navigate('Cart')),
        })}
      />
    </Stack.Navigator>
  );
}

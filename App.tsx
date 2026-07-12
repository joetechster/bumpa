import { Amiri_400Regular, Amiri_700Bold, useFonts } from '@expo-google-fonts/amiri';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { PaystackProvider } from 'react-native-paystack-webview';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { FlightProvider } from './src/animation/flightController';
import FlyingCartOverlay from './src/animation/FlyingCartOverlay';
import { PAYSTACK_PUBLIC_KEY } from './src/config/env';
import RootNavigator from './src/navigation/RootNavigator';
import { rehydrateCart, startCartPersistence } from './src/store/cartPersistence';
import { useCartStore } from './src/store/cartStore';
import { colors } from './src/theme/theme';

// The flying-cart overlay (Phase 5) mounts here as a SIBLING of the navigator,
// inside the same container, so ghosts are never clipped by a screen or list.
export default function App() {
  // The serif is the design's whole personality, so we hold the app on a cream
  // splash until it loads rather than letting the UI paint in the system font
  // and reflow. `error` is deliberately treated as "done": a missing font must
  // degrade to the system fallback, never to a bookshop you cannot open.
  const [fontsLoaded, fontError] = useFonts({ Amiri_400Regular, Amiri_700Bold });

  // Cart lifecycle: rehydrate once, then persist every change. Persistence
  // only starts writing after rehydration (the `hydrated` flag) so a cold
  // start can never clobber the stored cart with the initial empty state.
  useEffect(() => {
    void rehydrateCart(useCartStore);
    return startCartPersistence(useCartStore);
  }, []);

  if (!fontsLoaded && fontError === null) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator accessibilityLabel="Loading The Book Nook" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <PaystackProvider publicKey={PAYSTACK_PUBLIC_KEY} currency="NGN">
        <FlightProvider>
          <NavigationContainer>
            <RootNavigator />
            <StatusBar style="dark" />
          </NavigationContainer>
          {/* Sibling of the navigator: ghosts fly above every screen, clipped
              by nothing. pointerEvents="none" inside. */}
          <FlyingCartOverlay />
        </FlightProvider>
      </PaystackProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});

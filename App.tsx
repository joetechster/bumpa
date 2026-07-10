import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import RootNavigator from './src/navigation/RootNavigator';
import { rehydrateCart, startCartPersistence } from './src/store/cartPersistence';
import { useCartStore } from './src/store/cartStore';

// The flying-cart overlay (Phase 5) mounts here as a SIBLING of the navigator,
// inside the same container, so ghosts are never clipped by a screen or list.
export default function App() {
  // Cart lifecycle: rehydrate once, then persist every change. Persistence
  // only starts writing after rehydration (the `hydrated` flag) so a cold
  // start can never clobber the stored cart with the initial empty state.
  useEffect(() => {
    void rehydrateCart(useCartStore);
    return startCartPersistence(useCartStore);
  }, []);

  return (
    <NavigationContainer>
      <RootNavigator />
      <StatusBar style="auto" />
    </NavigationContainer>
  );
}

import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';

import RootNavigator from './src/navigation/RootNavigator';

// The flying-cart overlay (Phase 5) mounts here as a SIBLING of the navigator,
// inside the same container, so ghosts are never clipped by a screen or list.
export default function App() {
  return (
    <NavigationContainer>
      <RootNavigator />
      <StatusBar style="auto" />
    </NavigationContainer>
  );
}

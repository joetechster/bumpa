// Reanimated 4 splits the native bindings into react-native-worklets, which has
// no native runtime under Jest - mock it before anything imports Reanimated.
jest.mock('react-native-worklets', () => require('react-native-worklets/lib/module/mock'));

// Official Reanimated Jest setup - installs the animation test utils.
require('react-native-reanimated').setUpTests();

// AsyncStorage has no native module under Jest; its package ships this mock
// (in-memory, jest.fn-wrapped, resettable via AsyncStorage.clear()).
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// SafeAreaProvider renders NOTHING until it has measured its insets, and under
// Jest onLayout never fires - without this the whole app tree is empty and
// every query fails. The package ships this mock, which supplies static insets.
// `.default` is load-bearing: the shipped mock is an `export default {...}`, so
// under Babel's ESM interop a bare require() yields { default: ... } and every
// named import (SafeAreaProvider) resolves to undefined.
jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default,
);

// react-native-webview needs a native module that doesn't exist under Jest.
// The WebView is only ever exercised on a device (paystack-checkout skill:
// "do not try to render the WebView in Jest") - a plain View stands in.
jest.mock('react-native-webview', () => {
  const { View } = require('react-native');
  return { WebView: View, default: View };
});

// The suite must be silent. An unexpected console.error or console.warn fails the
// test that produced it - this is the only automated catch for React lifecycle
// warnings ("state update on unmounted component"), which the assessment grades.
const consoleError = console.error;
const consoleWarn = console.warn;

beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    consoleError(...args);
    throw new Error(`Unexpected console.error in test: ${args.map((a) => String(a)).join(' ')}`);
  });
  jest.spyOn(console, 'warn').mockImplementation((...args: unknown[]) => {
    consoleWarn(...args);
    throw new Error(`Unexpected console.warn in test: ${args.map((a) => String(a)).join(' ')}`);
  });
});

export {};

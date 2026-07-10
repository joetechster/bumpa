// Reanimated 4 splits the native bindings into react-native-worklets, which has
// no native runtime under Jest — mock it before anything imports Reanimated.
jest.mock('react-native-worklets', () => require('react-native-worklets/lib/module/mock'));

// Official Reanimated Jest setup — installs the animation test utils.
require('react-native-reanimated').setUpTests();

// AsyncStorage has no native module under Jest; its package ships this mock
// (in-memory, jest.fn-wrapped, resettable via AsyncStorage.clear()).
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// The suite must be silent. An unexpected console.error or console.warn fails the
// test that produced it — this is the only automated catch for React lifecycle
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

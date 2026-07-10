const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier');

module.exports = defineConfig([
  ...expoConfig,
  prettierConfig,
  {
    rules: {
      // The brief grades useEffect lifecycle handling; a silenced dependency
      // warning is exactly the bug class it is looking for. Error, never warn.
      'react-hooks/exhaustive-deps': 'error',
    },
  },
  {
    // jest.mock must run before react-native-reanimated is imported, which
    // rules out ES imports in the setup file.
    files: ['jest.setup.ts'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  {
    ignores: ['node_modules/**', '.expo/**', 'coverage/**', 'dist/**'],
  },
]);

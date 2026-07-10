/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  clearMocks: true,
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts', '!src/**/__fixtures__/**'],
  // Global thresholds sit just under the real numbers (≈96/89 at the time of
  // wiring) so any regression fails loudly without inviting threshold-chasing
  // tests. Money and cart state are pinned to 100%: they are the two places
  // a silent gap becomes a wrong charge. Not 100% globally, deliberately —
  // the uncovered remainder is visual glue (style branches, header wiring)
  // whose failure modes are only observable on a device.
  coverageThreshold: {
    global: { statements: 90, branches: 85, functions: 90, lines: 90 },
    './src/domain/money.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
    './src/domain/price.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
    './src/store/cartStore.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  },
};

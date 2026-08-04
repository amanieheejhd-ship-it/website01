/**
 * Shared Jest preset (wired up in Phase 8 — Testing). Projects consume it via:
 *   const preset = require('@fardeen/config/jest-preset');
 *   module.exports = { ...preset, displayName: '<project>' };
 */
module.exports = {
  testEnvironment: 'node',
  transform: {
    // isolatedModules: transpile-only (fast, no cross-file type-check — typecheck is a separate target).
    '^.+\\.[tj]sx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json', isolatedModules: true }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  testMatch: ['**/*.spec.ts', '**/*.spec.tsx', '**/*.test.ts'],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts'],
  // Resolve workspace packages from SOURCE so unit tests never depend on a built dist. Every project
  // lives at depth 2 (apps/<name> or packages/<name>), so ../../packages/* is uniform.
  moduleNameMapper: {
    '^@fardeen/types$': '<rootDir>/../../packages/types/src/index.ts',
    '^@fardeen/shared$': '<rootDir>/../../packages/shared/src/index.ts',
    '^@fardeen/utils$': '<rootDir>/../../packages/utils/src/index.ts',
  },
};

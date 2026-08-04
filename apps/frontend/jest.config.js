const preset = require('../../jest.preset.js');

/** @type {import('jest').Config} */
module.exports = {
  ...preset,
  displayName: 'frontend',
  testEnvironment: 'jsdom',
  // Frontend TS is jsx:preserve / module:esnext for Next; ts-jest needs commonjs + react-jsx.
  transform: {
    '^.+\\.[tj]sx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json', isolatedModules: true }],
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  // No coverage threshold in 8a — only the pure math + motion-gating hooks are exercised.
  collectCoverageFrom: [
    'src/hooks/use-reduced-motion.ts',
    'src/hooks/use-motion-ready.ts',
    'src/lib/cinematic/scenes.ts',
  ],
};

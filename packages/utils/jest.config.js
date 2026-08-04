const preset = require('../../jest.preset.js');

/** @type {import('jest').Config} */
module.exports = {
  ...preset,
  displayName: 'utils',
  coverageDirectory: '../../coverage/packages/utils',
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts'],
  coverageThreshold: { global: { branches: 90, functions: 90, lines: 90, statements: 90 } },
};

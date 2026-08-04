const preset = require('../../jest.preset.js');

/** @type {import('jest').Config} */
module.exports = {
  ...preset,
  displayName: 'ui',
  coverageDirectory: '../../coverage/packages/ui',
  // Only the pure lib helpers (cn) are unit-tested in 8a; visual components need jsdom/RTL (out of scope).
  collectCoverageFrom: ['src/lib/**/*.ts'],
};

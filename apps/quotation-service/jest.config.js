const preset = require('../../jest.preset.js');
module.exports = {
  ...preset,
  displayName: 'quotation-service',
  coverageDirectory: '../../coverage/apps/quotation-service',
  collectCoverageFrom: ['src/domain/**/*.ts', 'src/application/**/*.ts', '!src/**/*.d.ts'],
  coverageThreshold: { global: { branches: 85, functions: 85, lines: 85, statements: 85 } },
};

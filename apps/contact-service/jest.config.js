const preset = require('../../jest.preset.js');
module.exports = {
  ...preset,
  displayName: 'contact-service',
  coverageDirectory: '../../coverage/apps/contact-service',
  collectCoverageFrom: ['src/domain/**/*.ts', 'src/application/**/*.ts', '!src/**/*.d.ts'],
  coverageThreshold: { global: { branches: 85, functions: 85, lines: 85, statements: 85 } },
};

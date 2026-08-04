// Root Jest preset — the single source of truth every project's jest.config.js spreads via
// `require('../../jest.preset.js')`. Referenced by relative path (not the @fardeen/config package
// name) because config is not a linked dep of every project. Referenced by nx test cache inputs too.
module.exports = require('./packages/config/jest/preset.js');

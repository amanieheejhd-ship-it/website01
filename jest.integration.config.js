/**
 * Integration test config — runs *.integration.spec.ts against the REAL native Postgres (5432,
 * dedicated *_test DBs) + Redis (6379). Separate from the fast unit pass (those are ignored by the
 * unit preset). Serial (maxWorkers:1) so services don't contend on shared Redis and the machine
 * doesn't OOM; each spec opens its own Prisma/Redis connections and closes them in afterAll.
 *
 * Run all:            npx jest --config jest.integration.config.js --runInBand
 * Run one service:    npx jest --config jest.integration.config.js apps/auth-service
 * @type {import('jest').Config}
 */
module.exports = {
  displayName: 'integration',
  rootDir: '.',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/apps/**/*.integration.spec.ts'],
  transform: {
    '^.+\\.[tj]sx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.integration.json', isolatedModules: true }],
  },
  // The generated Prisma clients are plain CommonJS JS — never run them through ts-jest.
  transformIgnorePatterns: ['/node_modules/', '/generated/'],
  // rootDir is the repo root, so keep jest-haste-map out of built copies (dist / nx cache / coverage)
  // that would collide on the workspace package names.
  modulePathIgnorePatterns: ['<rootDir>/dist/', '<rootDir>/\\.nx/', '<rootDir>/coverage/'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  moduleNameMapper: {
    '^@fardeen/types$': '<rootDir>/packages/types/src/index.ts',
    '^@fardeen/shared$': '<rootDir>/packages/shared/src/index.ts',
    '^@fardeen/utils$': '<rootDir>/packages/utils/src/index.ts',
  },
  testTimeout: 30000,
  maxWorkers: 1,
};

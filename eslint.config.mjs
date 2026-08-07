import nx from '@nx/eslint-plugin';

/**
 * Flat ESLint config for the Fardeen workspace.
 *
 * The heart of this file is `@nx/enforce-module-boundaries`, which encodes the
 * dependency rules from docs/ARCHITECTURE.md as lint errors:
 *
 *   type:app-frontend  → ui, types, utils, config
 *   type:app-service   → shared, types, utils, config
 *   type:ui            → utils, config
 *   type:shared        → types, utils, config
 *   type:types         → config
 *   type:utils         → config
 *   type:config        → (leaf — depends on nothing)
 *
 * A backend service can never import frontend code, and apps can never import
 * each other. Violations fail `nx lint`.
 */
export default [
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  {
    ignores: [
      '**/dist',
      '**/.next',
      '**/out-tsc',
      '**/node_modules',
      '**/coverage',
      '**/.nx',
      '**/generated/**',
      '**/prisma/migrations/**',
      '**/public/basis/**',
      '**/public/draco/**',
    ],
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.cts', '**/*.mts', '**/*.js', '**/*.jsx'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: ['^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$'],
          depConstraints: [
            {
              sourceTag: 'type:app-frontend',
              onlyDependOnLibsWithTags: [
                'type:ui',
                'type:types',
                'type:utils',
                'type:config',
              ],
            },
            {
              sourceTag: 'type:app-service',
              onlyDependOnLibsWithTags: [
                'type:shared',
                'type:types',
                'type:utils',
                'type:config',
              ],
            },
            {
              sourceTag: 'type:ui',
              onlyDependOnLibsWithTags: ['type:utils', 'type:config'],
            },
            {
              sourceTag: 'type:shared',
              onlyDependOnLibsWithTags: ['type:types', 'type:utils', 'type:config'],
            },
            {
              sourceTag: 'type:types',
              onlyDependOnLibsWithTags: ['type:config'],
            },
            {
              sourceTag: 'type:utils',
              onlyDependOnLibsWithTags: ['type:config'],
            },
            {
              sourceTag: 'type:config',
              onlyDependOnLibsWithTags: [],
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      '**/*.ts',
      '**/*.tsx',
      '**/*.cts',
      '**/*.mts',
      '**/*.js',
      '**/*.jsx',
    ],
    rules: {},
  },
];

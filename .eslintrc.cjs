/** @type {import("eslint").ESLint.ConfigData} */
// eslint-disable-next-line no-undef
module.exports = {
  root: true,
  env: {
    es2021: true,
  },
  extends: ['prettier'],
  ignorePatterns: ['dist', 'build', 'node_modules', 'public/dicts'],
  overrides: [
    {
      files: ['scripts/*.cjs', '.eslintrc.cjs'],
      env: { node: true },
      extends: ['eslint:recommended'],
      parser: 'espree',
      parserOptions: { sourceType: 'script' },
    },
    {
      files: ['vite.config.ts', 'playwright.config.ts'],
      env: { node: true },
      extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
      parser: '@typescript-eslint/parser',
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      plugins: ['@typescript-eslint'],
    },
    {
      files: ['tailwind.config.js', 'postcss.config.js', 'prettier.config.js'],
      env: { node: true },
      extends: ['eslint:recommended'],
      parser: 'espree',
      parserOptions: { sourceType: 'script', ecmaVersion: 'latest' },
    },
    {
      files: ['src/**/*.ts', 'src/**/*.tsx'],
      env: { browser: true },
      extends: [
        'eslint:recommended',
        'plugin:react/recommended',
        'plugin:react-hooks/recommended',
        'plugin:react/jsx-runtime',
        'plugin:@typescript-eslint/recommended',
      ],
      parser: '@typescript-eslint/parser',
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      plugins: ['react', '@typescript-eslint'],
      settings: {
        react: {
          version: 'detect',
        },
      },
    },
    {
      files: ['tests/**/*.ts', 'tests/**/*.tsx'],
      env: { node: true },
      extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
      parser: '@typescript-eslint/parser',
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      plugins: ['@typescript-eslint'],
    },
  ],
  rules: {
    'sort-imports': ['error', { ignoreDeclarationSort: true }],
    '@typescript-eslint/consistent-type-imports': 1,
    'react/prop-types': 'off',
  },
}

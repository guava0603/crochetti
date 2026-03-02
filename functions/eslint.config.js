/**
 * Local flat ESLint config for Firebase Functions.
 *
 * This repo also has a root-level `eslint.config.js` for the web app; without
 * this file, `npm run lint` in `functions/` may accidentally use the root
 * config (and then flag Node globals like `require`/`exports`).
 */

module.exports = [
  {
    files: ['**/*.js'],
    ignores: ['node_modules/**'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        require: 'readonly',
        module: 'readonly',
        exports: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly'
      }
    },
    rules: {
      // Keep this minimal; Functions already follow Google style in many places.
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }]
    }
  }
]

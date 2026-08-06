import js from '@eslint/js';
import globals from 'globals';

export default [
  js.configs.recommended,

  // Browser ES modules (app source)
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      // This is a working, globals-heavy vanilla-JS app. Start lenient so the
      // signal is real bugs, not a wall of style noise. Tighten over time.
      'no-unused-vars': 'warn',
      'no-undef': 'warn',
      'no-empty': 'warn',
      'no-constant-condition': ['warn', { checkLoops: false }],
      'no-prototype-builtins': 'off',
      // Cosmetic — pre-existing in the codebase, not bugs. Warn, don't block.
      'no-useless-escape': 'warn',
      'no-useless-assignment': 'warn',
      'no-regex-spaces': 'warn',
    },
  },

  // Node-side tooling (.mjs): build scripts and test harnesses. Without this block
  // nothing matches them — they'd inherit no globals at all, so console/process/fetch
  // all read as undefined.
  {
    files: ['**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.node },
    },
    rules: {
      'no-unused-vars': 'warn',
      'no-undef': 'warn',
    },
  },

  // The split factories each import the full shared toolkit on purpose
  // (see CLAUDE.md) — don't flag the deliberately-unused imports.
  {
    files: ['modules/factories/**/*.js'],
    rules: { 'no-unused-vars': 'off' },
  },

  {
    ignores: [
      'dist/**',
      'dist-ci/**',
      'backups/**',
      '_archive/**',
      'scratch/**',
      'old_dist/**',
      'node_modules/**',
      'st-scraper/**',
      'dist_*.js',
      // All app logic is ESM .js; the .cjs files are throwaway scratch/probe
      // scripts (patch_*, test-*, debug_*) that mock browser globals.
      '**/*.cjs',
      // Root-level scratch probes (not valid standalone modules).
      'test-*.js',
    ],
  },
];

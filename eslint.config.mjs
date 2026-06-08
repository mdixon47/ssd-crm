// @ts-check
// Flat ESLint config using the standalone preset from `@nuxt/eslint-config`.
// Run `npm run lint` (CI) or `npx eslint .` locally.
import { createConfigForNuxt } from '@nuxt/eslint-config/flat'

export default createConfigForNuxt({
  features: {
    // Stylistic rules off — Prettier-style formatting is not part of CI yet.
    stylistic: false,
    tooling: true,
  },
})
  .append(
    {
      rules: {
        // Allow `console.warn` / `console.error` in server handlers and agents.
        'no-console': ['warn', { allow: ['warn', 'error'] }],
      },
    },
    {
      // CLI maintenance scripts may use stdout freely.
      files: ['scripts/**/*.mjs', 'scripts/**/*.js'],
      rules: {
        'no-console': 'off',
      },
    },
  )
  .prepend(
    {
      ignores: [
        '.nuxt',
        '.output',
        '.vercel',
        'dist',
        'node_modules',
        'coverage',
        'supabase/.temp',
        'supabase/.branches',
      ],
    },
  )

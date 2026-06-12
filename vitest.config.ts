import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

// Minimal vitest setup. We only need plain-Node unit coverage for pure
// modules (agents, server utils). Nuxt-specific resolution (auto-imports,
// Vue SFC compilation) is intentionally out of scope — those tests would
// require @nuxt/test-utils and a much heavier runtime. See docs/issues.md.
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
  resolve: {
    alias: {
      '~': fileURLToPath(new URL('./', import.meta.url)),
      '@': fileURLToPath(new URL('./', import.meta.url)),
    },
  },
})

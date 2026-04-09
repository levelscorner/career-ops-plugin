import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// Vitest config for detector + storage + parser unit tests.
// Uses happy-dom so the detectors can exercise `document.querySelector`
// and the JSON-LD walker against fixture HTML.
export default defineConfig({
  test: {
    environment: 'happy-dom',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    globals: false,
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});

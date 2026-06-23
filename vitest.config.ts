import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['packages/**/*.{test,spec}.{ts,tsx}', 'apps/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['**/node_modules', '**/dist', '**/.output', '**/.wxt'],
  },
  resolve: {
    alias: {
      '@manga-translator/shared': '/packages/shared/src/index.ts',
      '@manga-translator/reader-core': '/packages/reader-core/src/index.ts',
      '@manga-translator/overlay-core': '/packages/overlay-core/src/index.ts',
      '@manga-translator/inference-core': '/packages/inference-core/src/index.ts',
    }
  },
});

import { defineConfig } from 'vitest/config';
import path from 'path';

// NOTE: We intentionally do NOT use @vitejs/plugin-react here. This project pins
// Vite 4 while Vitest 2 bundles Vite 5, and the two React-refresh runtimes clash
// ("@vitejs/plugin-react can't detect preamble"). esbuild's automatic JSX runtime
// transforms .tsx for tests without needing the refresh preamble.
export default defineConfig({
  esbuild: {
    jsx: 'automatic',
  },
  resolve: {
    alias: {
      '@proto': path.resolve(__dirname, 'src_gen'),
      lodash: 'lodash-es',
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
});

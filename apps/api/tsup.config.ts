import { cp } from 'node:fs/promises';
import { defineConfig } from 'tsup';

/**
 * Production bundle: workspace packages (@auren/*, shipped as TS source) are inlined;
 * npm dependencies stay external and are installed in the image (PLAN §25.3).
 */
export default defineConfig({
  entry: { server: 'src/server.ts', worker: 'src/worker.ts', migrate: 'src/migrate.ts' },
  format: 'esm',
  platform: 'node',
  target: 'node24',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  splitting: true,
  noExternal: [/^@auren\//],
  // dist/migrate.js applies these SQL migrations in the release step
  onSuccess: () => cp('../../packages/db/drizzle', 'dist/drizzle', { recursive: true }),
});

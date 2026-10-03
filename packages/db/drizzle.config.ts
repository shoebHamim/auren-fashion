import { fileURLToPath } from 'node:url';
import { defineConfig } from 'drizzle-kit';

try {
  process.loadEnvFile(fileURLToPath(new URL('../../.env', import.meta.url)));
} catch {
  // CI and deployed environments provide env vars directly
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema/index.ts',
  out: './drizzle',
  casing: 'snake_case',
  strict: true,
  verbose: true,
  dbCredentials: { url: process.env.DATABASE_MIGRATOR_URL ?? '' },
});

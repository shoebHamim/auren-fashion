import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runAllMigrations } from '@auren/db/migrate';
import { z } from 'zod';

/**
 * Release-step entrypoint (PLAN §25.3): `node dist/migrate.js` runs every migration as the
 * migrator role (job-queue schema as the app role). In the bundle, SQL files are copied next to it under `dist/drizzle`.
 */
const connectionString = z.url().parse(process.env.DATABASE_MIGRATOR_URL, {
  error: () => 'DATABASE_MIGRATOR_URL must be set to a postgres:// URL',
});
const migrationsFolder =
  process.env.MIGRATIONS_FOLDER ??
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'drizzle');

await runAllMigrations({
  connectionString,
  jobQueueConnectionString: process.env.DATABASE_URL ?? connectionString,
  migrationsFolder,
});
process.stdout.write('Migrations applied.\n');

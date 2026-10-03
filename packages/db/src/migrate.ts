import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { runMigrations as runJobQueueMigrations } from 'graphile-worker';
import { createPool } from './client';

export const defaultMigrationsFolder = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../drizzle',
);

/** Read-only access to migration history for the API readiness check, when the app role exists. */
const GRANT_MIGRATION_HISTORY_TO_APP = `
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'auren_app') THEN
    GRANT USAGE ON SCHEMA drizzle TO auren_app;
    GRANT SELECT ON drizzle.__drizzle_migrations TO auren_app;
  END IF;
END $$;`;

/**
 * Applies every schema change (PLAN §8.7):
 * 1. Drizzle SQL migrations, as the migrator role (owner of `public`);
 * 2. the job-queue schema, as the role that owns `graphile_worker` (the app role in deployed
 *    environments, because graphile-worker's row-level security only lets the owner enqueue).
 */
export async function runAllMigrations(options: {
  connectionString: string;
  /** Connection used for the job-queue schema. Defaults to `connectionString`. */
  jobQueueConnectionString?: string;
  migrationsFolder?: string;
}): Promise<void> {
  const pool = createPool(options.connectionString, { max: 1, application_name: 'auren-migrate' });
  try {
    await migrate(drizzle({ client: pool }), {
      migrationsFolder: options.migrationsFolder ?? defaultMigrationsFolder,
    });
    await pool.query(GRANT_MIGRATION_HISTORY_TO_APP);
  } finally {
    await pool.end();
  }

  const jobPool = createPool(options.jobQueueConnectionString ?? options.connectionString, {
    max: 1,
    application_name: 'auren-migrate-jobs',
  });
  try {
    await runJobQueueMigrations({ pgPool: jobPool });
  } finally {
    await jobPool.end();
  }
}

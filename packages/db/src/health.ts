import { sql } from 'drizzle-orm';
import journal from '../drizzle/meta/_journal.json' with { type: 'json' };
import type { DbExecutor } from './client';

/** Number of migrations this build of the code expects to have been applied. */
export const expectedMigrationCount = journal.entries.length;

export type DatabaseStatus = {
  reachable: boolean;
  appliedMigrations: number;
  expectedMigrations: number;
  upToDate: boolean;
};

/** Used by `/api/ready`: the API must not serve traffic against an unmigrated database (PLAN §24.1). */
export async function getDatabaseStatus(db: DbExecutor): Promise<DatabaseStatus> {
  const result = await db.execute<{ applied: number }>(
    sql`SELECT count(*)::int AS applied FROM drizzle.__drizzle_migrations`,
  );
  const appliedMigrations = result.rows[0]?.applied ?? 0;
  return {
    reachable: true,
    appliedMigrations,
    expectedMigrations: expectedMigrationCount,
    upToDate: appliedMigrations >= expectedMigrationCount,
  };
}

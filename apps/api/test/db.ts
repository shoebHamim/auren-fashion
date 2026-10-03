import { randomUUID } from 'node:crypto';
import { createDb, createPool, type Database, type Pool } from '@auren/db';
import { seedBase } from '@auren/db/seed';
import { sql } from 'drizzle-orm';
import pg from 'pg';
import { inject } from 'vitest';

export type TestDatabase = { db: Database; pool: Pool; url: string; drop: () => Promise<void> };

async function adminQuery(text: string): Promise<void> {
  const client = new pg.Client({ connectionString: inject('postgres').adminUrl });
  await client.connect();
  try {
    await client.query(text);
  } finally {
    await client.end();
  }
}

/** A fresh, fully migrated database for one test file (cloned from the template). */
export async function createTestDatabase(): Promise<TestDatabase> {
  const { adminUrl, templateDatabase } = inject('postgres');
  const name = `test_${randomUUID().replaceAll('-', '')}`;
  await adminQuery(`CREATE DATABASE ${name} TEMPLATE ${templateDatabase}`);

  const url = new URL(adminUrl);
  url.pathname = `/${name}`;
  const pool = createPool(url.toString(), { max: 10, application_name: 'auren-test' });
  const db = createDb(pool);
  await seedBase(db);

  return {
    db,
    pool,
    url: url.toString(),
    drop: async () => {
      await pool.end();
      await adminQuery(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
    },
  };
}

/** Empties every business table and the job queue, then re-applies the base seed. */
export async function resetDatabase(db: Database): Promise<void> {
  const { rows } = await db.execute<{ tablename: string }>(
    sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`,
  );
  if (rows.length > 0) {
    const tables = rows.map((row) => `"public"."${row.tablename}"`).join(', ');
    await db.execute(sql.raw(`TRUNCATE ${tables} RESTART IDENTITY CASCADE`));
  }
  await db.execute(sql`DELETE FROM graphile_worker._private_jobs`);
  await seedBase(db);
}

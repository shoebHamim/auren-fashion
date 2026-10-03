import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { enqueueJob } from '../src/jobs/enqueue';
import { createTestDatabase, resetDatabase, type TestDatabase } from './db';

let testDb: TestDatabase;

beforeAll(async () => {
  testDb = await createTestDatabase();
});
afterAll(async () => {
  await testDb.drop();
});
beforeEach(async () => {
  await resetDatabase(testDb.db);
});

async function jobCount(): Promise<number> {
  const result = await testDb.db.execute<{ n: number }>(
    sql`SELECT count(*)::int AS n FROM graphile_worker.jobs`,
  );
  return result.rows[0]?.n ?? 0;
}

describe('enqueueJob (transactional outbox, PLAN §4.4)', () => {
  it('creates the job when the business transaction commits', async () => {
    await testDb.db.transaction(async (tx) => {
      await enqueueJob(tx, 'system:heartbeat', {});
    });
    expect(await jobCount()).toBe(1);
  });

  it('leaves no job behind when the transaction rolls back', async () => {
    await expect(
      testDb.db.transaction(async (tx) => {
        await enqueueJob(tx, 'system:heartbeat', {});
        throw new Error('business rule failed');
      }),
    ).rejects.toThrow('business rule failed');
    expect(await jobCount()).toBe(0);
  });

  it('de-duplicates pending jobs that share a job key', async () => {
    await enqueueJob(testDb.db, 'system:heartbeat', {}, { jobKey: 'dedupe' });
    await enqueueJob(testDb.db, 'system:heartbeat', {}, { jobKey: 'dedupe' });
    expect(await jobCount()).toBe(1);
  });
});

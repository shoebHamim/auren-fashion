import { storeSettings } from '@auren/db';
import { eq, sql } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { mapDatabaseError } from '../src/lib/pg-errors';
import { withTransaction } from '../src/lib/tx';
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

async function capture(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error('expected the operation to fail');
}

describe('database error mapping against real Postgres', () => {
  it('maps a unique violation to 409 CONFLICT', async () => {
    const error = await capture(testDb.db.insert(storeSettings).values({ id: 1 }));
    expect(mapDatabaseError(error)).toMatchObject({ status: 409, code: 'CONFLICT' });
  });

  it('treats a CHECK violation as a bug (500), never a client error', async () => {
    const error = await capture(testDb.db.insert(storeSettings).values({ id: 2 }));
    expect(mapDatabaseError(error)).toMatchObject({ status: 500, code: 'INTERNAL_ERROR' });
  });
});

describe('withTransaction against real Postgres', () => {
  it('retries a genuine serialization failure (40001) and then succeeds', async () => {
    let attempts = 0;
    const result = await withTransaction(
      testDb.db,
      async (tx) => {
        attempts++;
        const [row] = await tx
          .select({ version: storeSettings.version })
          .from(storeSettings)
          .where(eq(storeSettings.id, 1));
        if (attempts === 1) {
          // A concurrent writer commits after this transaction's snapshot was taken.
          await testDb.pool.query('UPDATE store_settings SET version = version + 1 WHERE id = 1');
        }
        await tx
          .update(storeSettings)
          .set({ version: (row?.version ?? 0) + 1 })
          .where(eq(storeSettings.id, 1));
        return attempts;
      },
      { isolationLevel: 'repeatable read' },
    );

    expect(result).toBe(2);
    const [after] = await testDb.db.select().from(storeSettings);
    expect(after?.version).toBe(3); // seed 1 → concurrent writer 2 → retried transaction 3
  });

  it('commits nothing when the work throws', async () => {
    await expect(
      withTransaction(testDb.db, async (tx) => {
        await tx.execute(sql`UPDATE store_settings SET store_name = 'Changed' WHERE id = 1`);
        throw new Error('abort');
      }),
    ).rejects.toThrow('abort');
    const [after] = await testDb.db.select().from(storeSettings);
    expect(after?.storeName).toBe('Auren');
  });
});

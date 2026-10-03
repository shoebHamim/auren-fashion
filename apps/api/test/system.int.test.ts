import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildTestApp } from './app';
import { createTestDatabase, type TestDatabase } from './db';

let testDb: TestDatabase;

beforeAll(async () => {
  testDb = await createTestDatabase();
});
afterAll(async () => {
  await testDb.drop();
});

describe('GET /api/ready', () => {
  it('is ready when the database is migrated to the expected version', async () => {
    const res = await buildTestApp(testDb.db).request('/api/ready');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ status: 'ready', checks: { database: { upToDate: true } } });
  });
});

import type { Database } from '@auren/db';
import { describe, expect, it, vi } from 'vitest';
import { withTransaction } from './tx';

const serializationFailure = () =>
  Object.assign(new Error('could not serialize'), { code: '40001' });

function fakeDb(failures: Error[]): { db: Database; calls: () => number } {
  let calls = 0;
  const db = {
    transaction: vi.fn(async (work: (tx: unknown) => Promise<unknown>) => {
      calls++;
      const failure = failures.shift();
      if (failure) throw failure;
      return work({});
    }),
  } as unknown as Database;
  return { db, calls: () => calls };
}

describe('withTransaction', () => {
  it('retries once on a serialization failure, then succeeds', async () => {
    const { db, calls } = fakeDb([serializationFailure()]);
    await expect(withTransaction(db, () => Promise.resolve('done'))).resolves.toBe('done');
    expect(calls()).toBe(2);
  });

  it('gives up after maxRetries', async () => {
    const { db, calls } = fakeDb([serializationFailure(), serializationFailure()]);
    await expect(withTransaction(db, () => Promise.resolve('done'))).rejects.toThrow(
      'could not serialize',
    );
    expect(calls()).toBe(2);
  });

  it('does not retry other errors', async () => {
    const { db, calls } = fakeDb([Object.assign(new Error('unique'), { code: '23505' })]);
    await expect(withTransaction(db, () => Promise.resolve('done'))).rejects.toThrow('unique');
    expect(calls()).toBe(1);
  });
});

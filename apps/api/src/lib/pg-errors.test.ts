import { describe, expect, it } from 'vitest';
import { AppError } from './errors';
import {
  findPgError,
  isRetryableTransactionError,
  mapDatabaseError,
  registerConstraintError,
} from './pg-errors';

function pgError(code: string, extra: Record<string, unknown> = {}): Error {
  return Object.assign(new Error(`pg ${code}`), { code, ...extra });
}

/** Mirrors how Drizzle wraps driver errors. */
function wrapped(cause: Error): Error {
  return new Error('Failed query: …', { cause });
}

describe('findPgError', () => {
  it('walks the cause chain to the driver error', () => {
    const inner = pgError('23505');
    expect(findPgError(wrapped(inner))).toBe(inner);
  });

  it('ignores non-SQLSTATE codes and non-errors', () => {
    expect(findPgError(Object.assign(new Error('x'), { code: 'ECONNREFUSED' }))).toBeUndefined();
    expect(findPgError('boom')).toBeUndefined();
  });
});

describe('mapDatabaseError', () => {
  it.each([
    ['23505', 409, 'CONFLICT'],
    ['23503', 409, 'CONFLICT'],
    ['40001', 409, 'CONCURRENT_UPDATE'],
    ['40P01', 409, 'CONCURRENT_UPDATE'],
    ['57014', 503, 'SERVICE_UNAVAILABLE'],
    ['23514', 500, 'INTERNAL_ERROR'],
    ['42P01', 500, 'INTERNAL_ERROR'],
  ])('maps SQLSTATE %s to %i %s', (code, status, errorCode) => {
    const mapped = mapDatabaseError(wrapped(pgError(code)));
    expect(mapped?.status).toBe(status);
    expect(mapped?.code).toBe(errorCode);
  });

  it('prefers a registered constraint mapping', () => {
    registerConstraintError(
      'test_sku_key',
      () => new AppError(409, 'CONFLICT', 'That SKU is already in use.'),
    );
    const mapped = mapDatabaseError(wrapped(pgError('23505', { constraint: 'test_sku_key' })));
    expect(mapped?.message).toBe('That SKU is already in use.');
  });

  it('maps network failures to 503 and ignores unrelated errors', () => {
    const network = wrapped(Object.assign(new Error('connect'), { code: 'ECONNREFUSED' }));
    expect(mapDatabaseError(network)?.status).toBe(503);
    expect(mapDatabaseError(new Error('unrelated'))).toBeUndefined();
  });
});

describe('isRetryableTransactionError', () => {
  it('retries only serialization failures and deadlocks', () => {
    expect(isRetryableTransactionError(wrapped(pgError('40001')))).toBe(true);
    expect(isRetryableTransactionError(wrapped(pgError('40P01')))).toBe(true);
    expect(isRetryableTransactionError(wrapped(pgError('23505')))).toBe(false);
  });
});

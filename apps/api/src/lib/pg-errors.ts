import type { AppError } from './errors';
import { errors } from './errors';

/** The subset of a node-postgres `DatabaseError` we rely on. */
export type PgError = Error & { code: string; constraint?: string; table?: string };

const NETWORK_CODES = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  'EHOSTUNREACH',
  'ENOTFOUND',
]);

/** Drizzle wraps driver errors (`DrizzleQueryError.cause`), so walk the cause chain. */
export function findPgError(error: unknown): PgError | undefined {
  let current: unknown = error;
  for (let depth = 0; depth < 5 && current instanceof Error; depth++) {
    const code = (current as { code?: unknown }).code;
    if (typeof code === 'string' && /^[0-9A-Z]{5}$/.test(code)) return current as PgError;
    current = current.cause;
  }
  return undefined;
}

function findNetworkError(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; depth < 5 && current instanceof Error; depth++) {
    const code = (current as { code?: unknown }).code;
    if (typeof code === 'string' && NETWORK_CODES.has(code)) return true;
    current = current.cause;
  }
  return false;
}

export const RETRYABLE_PG_CODES = new Set(['40001', '40P01']); // serialization_failure, deadlock_detected

export function isRetryableTransactionError(error: unknown): boolean {
  const pgError = findPgError(error);
  return pgError !== undefined && RETRYABLE_PG_CODES.has(pgError.code);
}

/**
 * Domain modules register user-facing meanings for specific constraints, e.g.
 * `product_variants_sku_key → SKU_TAKEN` (PLAN §9.7). Unregistered violations fall back to generic codes.
 */
const constraintErrors = new Map<string, () => AppError>();

export function registerConstraintError(constraint: string, factory: () => AppError): void {
  constraintErrors.set(constraint, factory);
}

/** Maps database failures to safe client errors. Returns undefined for non-database errors. */
export function mapDatabaseError(error: unknown): AppError | undefined {
  const pgError = findPgError(error);
  if (pgError) {
    const registered = pgError.constraint ? constraintErrors.get(pgError.constraint) : undefined;
    if (registered) return registered();
    switch (pgError.code) {
      case '23505': // unique_violation
        return errors.conflict('A record with these details already exists.');
      case '23503': // foreign_key_violation
        return errors.conflict('This record is referenced by, or references, another record.');
      case '40001':
      case '40P01':
        return errors.concurrentUpdate();
      case '57014': // query_canceled (statement timeout)
      case '57P01': // admin_shutdown
      case '53300': // too_many_connections
        return errors.unavailable(error);
      default:
        // CHECK violations and everything else indicate a bug: the service should have validated.
        return errors.internal(error);
    }
  }
  if (findNetworkError(error)) return errors.unavailable(error);
  return undefined;
}

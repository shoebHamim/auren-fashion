import type { Database, Transaction } from '@auren/db';
import { isRetryableTransactionError } from './pg-errors';

type IsolationLevel = 'read committed' | 'repeatable read' | 'serializable';

/**
 * Runs `work` in one transaction. Serialization failures and deadlocks (40001/40P01) are retried
 * with a short jittered backoff (default: once), then surface as `409 CONCURRENT_UPDATE` (PLAN §8.6).
 * `work` must be safe to re-run: no network calls inside transactions (PLAN §8.5).
 */
export async function withTransaction<T>(
  db: Database,
  work: (tx: Transaction) => Promise<T>,
  options: { isolationLevel?: IsolationLevel; maxRetries?: number } = {},
): Promise<T> {
  const maxRetries = options.maxRetries ?? 1;
  for (let attempt = 0; ; attempt++) {
    try {
      return await db.transaction(work, {
        isolationLevel: options.isolationLevel ?? 'read committed',
      });
    } catch (error) {
      if (attempt >= maxRetries || !isRetryableTransactionError(error)) throw error;
      await new Promise((resolve) => setTimeout(resolve, 10 + Math.random() * 40 * (attempt + 1)));
    }
  }
}

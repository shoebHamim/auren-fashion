import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema/index';

export type Database = NodePgDatabase<typeof schema>;
export type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];
/** Either the pool-backed database or an open transaction (PLAN §4.2). */
export type DbExecutor = Database | Transaction;

export type Pool = pg.Pool;

export function createPool(
  connectionString: string,
  options: pg.PoolConfig & { onError?: (error: Error) => void } = {},
): pg.Pool {
  const { onError, ...config } = options;
  const pool = new pg.Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    application_name: 'auren',
    ...config,
  });
  // A connection error (e.g. DB restart) must not crash the process: listen on the pool (idle
  // clients) and on every client (checked-out clients); the failing query still rejects normally.
  // Apps pass `onError` to route this through their logger; console is only the fallback.
  // eslint-disable-next-line no-console
  const handleError = onError ?? ((error: Error) => console.error('[db] client error', error));
  pool.on('error', handleError);
  pool.on('connect', (client) => client.on('error', handleError));
  return pool;
}

export function createDb(pool: pg.Pool): Database {
  return drizzle({ client: pool, schema, casing: 'snake_case' });
}

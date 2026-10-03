import type { Database } from '@auren/db';
import { createApp } from '../src/app';
import type { Env } from '../src/env';
import { createLogger } from '../src/lib/logger';

export const testEnv: Env = {
  NODE_ENV: 'test',
  API_PORT: 0,
  DATABASE_URL: 'postgres://unused@localhost:5432/unused',
  WEB_ORIGIN: 'http://localhost:3100',
  LOG_LEVEL: 'silent',
  DB_POOL_MAX: 5,
  WORKER_CONCURRENCY: 1,
};

/** Builds the real app (all middleware) around a given database, for `app.request()` tests. */
export function buildTestApp(db: Database, env: Partial<Env> = {}) {
  return createApp({
    env: { ...testEnv, ...env },
    log: createLogger({ level: 'silent' }),
    db,
  });
}

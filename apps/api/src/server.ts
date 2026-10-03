import { createDb, createPool } from '@auren/db';
import { serve } from '@hono/node-server';
import { createApp } from './app';
import { loadEnv } from './env';
import { createLogger } from './lib/logger';

const env = loadEnv();
const log = createLogger({ level: env.LOG_LEVEL, pretty: env.NODE_ENV === 'development' });
const pool = createPool(env.DATABASE_URL, {
  max: env.DB_POOL_MAX,
  application_name: 'auren-api',
  onError: (error) => log.error({ err: error }, 'idle database client error'),
});
const app = createApp({ env, log, db: createDb(pool) });

const server = serve({ fetch: app.fetch, port: env.API_PORT }, (info) => {
  log.info({ port: info.port, env: env.NODE_ENV }, 'api listening');
});

let shuttingDown = false;
function shutdown(signal: string): void {
  if (shuttingDown) return;
  shuttingDown = true;
  log.info({ signal }, 'shutting down');
  const forceExit = setTimeout(() => process.exit(1), 10_000);
  forceExit.unref();
  server.close(() => {
    pool
      .end()
      .catch((error: unknown) => log.error({ err: error }, 'error closing database pool'))
      .finally(() => process.exit(0));
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (reason) => {
  log.fatal({ err: reason }, 'unhandled promise rejection');
  process.exit(1);
});

import { createDb, createPool } from '@auren/db';
import { Logger as WorkerLogger, run } from 'graphile-worker';
import { loadEnv } from './env';
import { CRONTAB, createTaskList } from './jobs/tasks';
import { createLogger } from './lib/logger';

/** Background worker: same modules as the API, separate process (PLAN §4.3, §4.4). */
const env = loadEnv();
const log = createLogger({
  level: env.LOG_LEVEL,
  pretty: env.NODE_ENV === 'development',
  name: 'auren-worker',
});
const pool = createPool(env.DATABASE_URL, {
  max: env.WORKER_CONCURRENCY + 2,
  application_name: 'auren-worker',
  onError: (error) => log.error({ err: error }, 'database client error'),
});

type JobMeta = { id?: unknown; task_identifier?: unknown; attempts?: unknown };

/** graphile-worker logs whole job rows; keep only identifiers so payload PII never reaches logs. */
function sanitizeMeta(meta: Record<string, unknown>): Record<string, unknown> {
  const job = meta.job as JobMeta | undefined;
  if (!job) return meta;
  return {
    ...meta,
    job: { id: job.id, task: job.task_identifier, attempts: job.attempts },
  };
}

const workerLogger = new WorkerLogger((scope) => (level, message, rawMeta) => {
  const meta = sanitizeMeta(rawMeta);
  const child = log.child({ scope });
  if (level === 'error') child.error(meta, message);
  else if (level === 'warning') child.warn(meta, message);
  else if (level === 'info') child.info(meta, message);
  else child.debug(meta, message);
});

const runner = await run({
  pgPool: pool,
  concurrency: env.WORKER_CONCURRENCY,
  taskList: createTaskList({ db: createDb(pool) }),
  crontab: CRONTAB,
  logger: workerLogger,
  noHandleSignals: true,
});
log.info({ concurrency: env.WORKER_CONCURRENCY }, 'worker started');

let shuttingDown = false;
async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  log.info({ signal }, 'worker shutting down');
  const forceExit = setTimeout(() => process.exit(1), 30_000);
  forceExit.unref();
  try {
    await runner.stop(); // lets in-flight jobs finish
    await pool.end();
    process.exit(0);
  } catch (error) {
    log.error({ err: error }, 'error during worker shutdown');
    process.exit(1);
  }
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('unhandledRejection', (reason) => {
  log.fatal({ err: reason }, 'unhandled promise rejection');
  process.exit(1);
});

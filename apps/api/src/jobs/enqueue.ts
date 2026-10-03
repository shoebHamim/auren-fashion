import type { DbExecutor } from '@auren/db';
import { sql } from 'drizzle-orm';

/**
 * Payload type per task. Adding a task = add it here and to `createTaskList` (PLAN §4.4).
 * Task names use `module:action` (graphile-worker crontab allows `[_a-zA-Z0-9:/-]`).
 */
export type TaskPayloads = {
  'system:heartbeat': Record<string, never>;
};

export type TaskName = keyof TaskPayloads;

export type EnqueueOptions = {
  runAt?: Date;
  maxAttempts?: number;
  /** De-duplicates: a pending job with the same key is replaced instead of added. */
  jobKey?: string;
  queueName?: string;
  priority?: number;
};

/**
 * Enqueues a job **inside the caller's transaction** (PLAN §4.4): the job exists if and only if
 * the business change commits — the transactional-outbox guarantee without an outbox table.
 */
export async function enqueueJob<T extends TaskName>(
  executor: DbExecutor,
  task: T,
  payload: TaskPayloads[T],
  options: EnqueueOptions = {},
): Promise<void> {
  const named = [
    options.queueName !== undefined ? sql`queue_name => ${options.queueName}` : undefined,
    options.runAt !== undefined
      ? sql`run_at => ${options.runAt.toISOString()}::timestamptz`
      : undefined,
    options.maxAttempts !== undefined
      ? sql`max_attempts => ${options.maxAttempts}::int`
      : undefined,
    options.jobKey !== undefined ? sql`job_key => ${options.jobKey}` : undefined,
    options.priority !== undefined ? sql`priority => ${options.priority}::int` : undefined,
  ].filter((part) => part !== undefined);

  const args = [sql`${task}`, sql`${JSON.stringify(payload)}::json`, ...named];
  await executor.execute(sql`SELECT graphile_worker.add_job(${sql.join(args, sql`, `)})`);
}

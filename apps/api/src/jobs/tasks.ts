import { systemHeartbeats } from '@auren/db';
import type { Task, TaskList } from 'graphile-worker';
import type { AppDeps } from '../types';
import type { TaskName, TaskPayloads } from './enqueue';

type Handler<T extends TaskName> = (
  payload: TaskPayloads[T],
  helpers: Parameters<Task>[1],
) => Promise<void>;

/** Job handlers stay thin: they call module services, which own the business rules. */
export function createTaskList(deps: Pick<AppDeps, 'db'>): TaskList {
  const heartbeat: Handler<'system:heartbeat'> = async () => {
    const now = new Date();
    await deps.db
      .insert(systemHeartbeats)
      .values({ name: 'worker', beatAt: now, details: { pid: process.pid } })
      .onConflictDoUpdate({
        target: systemHeartbeats.name,
        set: { beatAt: now, details: { pid: process.pid } },
      });
  };

  const tasks: { [K in TaskName]: Handler<K> } = {
    'system:heartbeat': heartbeat,
  };
  return tasks as unknown as TaskList;
}

/** Recurring jobs (graphile-worker crontab syntax). */
export const CRONTAB = ['* * * * * system:heartbeat'].join('\n');

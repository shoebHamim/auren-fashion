import { jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

/** Liveness of background processes; a stale `worker` row raises an alert (PLAN §24.1). */
export const systemHeartbeats = pgTable('system_heartbeats', {
  name: text().primaryKey(),
  beatAt: timestamp({ withTimezone: true }).notNull(),
  details: jsonb().$type<Record<string, unknown>>(),
});

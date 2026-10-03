import { bigint, timestamp, uuid } from 'drizzle-orm/pg-core';
import { uuidv7 } from 'uuidv7';

/** UUID v7 primary key, generated in the app so it is known before insert (PLAN §8.1). */
export const id = () =>
  uuid()
    .primaryKey()
    .$defaultFn(() => uuidv7());

/** Money: integer minor units, mapped to a JS number (PLAN §8.8). */
export const money = () => bigint({ mode: 'number' });

export const timestamps = () => ({
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

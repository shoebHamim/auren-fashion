import type { Database } from './client';
import { storeSettings } from './schema/index';

/**
 * `seed:base` — reference data every environment needs (PLAN §8.7). Idempotent.
 * Later phases add roles/permissions, the default stock location, attributes and tax classes here.
 */
export async function seedBase(db: Database): Promise<void> {
  await db.insert(storeSettings).values({ id: 1 }).onConflictDoNothing();
}

import { seedBase } from '../seed';
import { createDb, createPool } from '../client';
import { loadRootEnv, requireEnv } from './env';

loadRootEnv();
const pool = createPool(requireEnv('DATABASE_URL'), { max: 1 });
try {
  await seedBase(createDb(pool));
  console.info('Base seed applied.');
} finally {
  await pool.end();
}

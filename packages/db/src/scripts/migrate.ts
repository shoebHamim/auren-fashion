import { runAllMigrations } from '../migrate';
import { loadRootEnv, requireEnv } from './env';

loadRootEnv();
await runAllMigrations({
  connectionString: requireEnv('DATABASE_MIGRATOR_URL'),
  jobQueueConnectionString: requireEnv('DATABASE_URL'),
});
console.info('Migrations applied.');

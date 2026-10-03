import type { Database } from '@auren/db';
import type { Env } from './env';
import type { Logger } from './lib/logger';

/** Long-lived dependencies, created once at boot and injected into route factories. */
export type AppDeps = {
  env: Env;
  log: Logger;
  db: Database;
};

/** Per-request context variables (typed `c.var`). Phase 1 adds `session` and `actor`. */
export type AppEnv = {
  Variables: {
    requestId: string;
    log: Logger;
  };
};

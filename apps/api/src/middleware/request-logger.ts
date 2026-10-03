import type { MiddlewareHandler } from 'hono';
import type { Logger } from '../lib/logger';
import type { AppEnv } from '../types';

const QUIET_PATHS = new Set(['/api/health', '/api/ready']);

/** One structured line per request, with a request-scoped child logger in `c.var.log` (PLAN §24.1). */
export function requestLogger(log: Logger): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const startedAt = performance.now();
    const requestLog = log.child({ requestId: c.get('requestId') });
    c.set('log', requestLog);

    await next();

    const entry = {
      method: c.req.method,
      path: c.req.path,
      status: c.res.status,
      durationMs: Math.round(performance.now() - startedAt),
    };
    if (entry.status >= 500) requestLog.error(entry, 'request failed');
    else if (entry.durationMs > 1000) requestLog.warn({ ...entry, slow: true }, 'slow_request');
    else if (QUIET_PATHS.has(entry.path)) requestLog.debug(entry, 'request completed');
    else requestLog.info(entry, 'request completed');
  };
}

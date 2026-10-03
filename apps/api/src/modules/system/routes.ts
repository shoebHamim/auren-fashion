import { getDatabaseStatus } from '@auren/db';
import { createRoute, z } from '@hono/zod-openapi';
import { createRouter, errorResponses } from '../../lib/openapi';
import type { AppDeps } from '../../types';

const healthResponse = z.object({ status: z.literal('ok') }).meta({ id: 'Health' });

const readinessResponse = z
  .object({
    status: z.enum(['ready', 'not_ready']),
    checks: z.object({
      database: z.object({
        reachable: z.boolean(),
        appliedMigrations: z.number().int(),
        expectedMigrations: z.number().int(),
        upToDate: z.boolean(),
      }),
    }),
  })
  .meta({ id: 'Readiness' });

const healthRoute = createRoute({
  method: 'get',
  path: '/health',
  tags: ['system'],
  summary: 'Liveness: the process is up (no dependencies checked)',
  responses: {
    200: { description: 'Alive', content: { 'application/json': { schema: healthResponse } } },
    ...errorResponses(500),
  },
});

const readyRoute = createRoute({
  method: 'get',
  path: '/ready',
  tags: ['system'],
  summary: 'Readiness: database reachable and migrated to the version this build expects',
  responses: {
    200: { description: 'Ready', content: { 'application/json': { schema: readinessResponse } } },
    503: {
      description: 'Not ready',
      content: { 'application/json': { schema: readinessResponse } },
    },
  },
});

export function systemRoutes(deps: Pick<AppDeps, 'db'>) {
  return createRouter()
    .openapi(healthRoute, (c) => c.json({ status: 'ok' as const }, 200))
    .openapi(readyRoute, async (c) => {
      try {
        const database = await getDatabaseStatus(deps.db);
        const status = database.upToDate ? ('ready' as const) : ('not_ready' as const);
        return c.json({ status, checks: { database } }, database.upToDate ? 200 : 503);
      } catch (error) {
        c.var.log.warn({ err: error }, 'readiness check failed');
        const database = {
          reachable: false,
          appliedMigrations: 0,
          expectedMigrations: 0,
          upToDate: false,
        };
        return c.json({ status: 'not_ready' as const, checks: { database } }, 503);
      }
    });
}

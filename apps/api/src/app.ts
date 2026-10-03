import { bodyLimit } from 'hono/body-limit';
import { requestId } from 'hono/request-id';
import { secureHeaders } from 'hono/secure-headers';
import { uuidv7 } from 'uuidv7';
import { errors } from './lib/errors';
import { createRouter } from './lib/openapi';
import { errorHandler, errorResponse, notFoundHandler } from './middleware/error-handler';
import { requestLogger } from './middleware/request-logger';
import { systemRoutes } from './modules/system/routes';
import type { AppDeps } from './types';

const DEFAULT_BODY_LIMIT = 1024 * 1024; // 1 MB; upload/import routes raise it per route

/**
 * Composes the API (PLAN §9.4). Everything lives under `/api` so the edge can route by path.
 * Later phases mount `/auth`, `/store`, `/admin` and `/webhooks` here.
 */
export function createApp(deps: AppDeps) {
  const app = createRouter().basePath('/api');

  app.use('*', requestId({ headerName: 'X-Request-Id', generator: () => uuidv7() }));
  app.use('*', requestLogger(deps.log));
  app.use('*', secureHeaders());
  app.use(
    '*',
    bodyLimit({
      maxSize: DEFAULT_BODY_LIMIT,
      onError: (c) => errorResponse(c, errors.payloadTooLarge()),
    }),
  );
  app.onError(errorHandler(deps.log));
  app.notFound(notFoundHandler);

  if (deps.env.NODE_ENV !== 'production') {
    app.doc31('/openapi.json', {
      openapi: '3.1.0',
      info: { title: 'Auren API', version: '0.0.0' },
    });
  }

  return app.route('/', systemRoutes(deps));
}

/** Full route type, consumed by the web app's typed `hc` client (type-only import). */
export type AppType = ReturnType<typeof createApp>;

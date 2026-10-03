import { errorEnvelopeSchema } from '@auren/contracts';
import { OpenAPIHono } from '@hono/zod-openapi';
import type { AppEnv } from '../types';
import { errors, zodIssues } from './errors';

/** Every router validates with Zod and reports failures in the standard envelope (PLAN §9.7). */
export function createRouter() {
  return new OpenAPIHono<AppEnv>({
    defaultHook: (result) => {
      if (!result.success) throw errors.validation(zodIssues(result.error));
    },
  });
}

const errorDescriptions = {
  400: 'Invalid request',
  401: 'Not authenticated',
  403: 'Not allowed',
  404: 'Not found',
  409: 'Conflicts with current state',
  410: 'Gone',
  413: 'Payload too large',
  422: 'Business rule violated',
  429: 'Rate limited',
  500: 'Internal error',
  503: 'Service unavailable',
} as const;

type DocumentedErrorStatus = keyof typeof errorDescriptions;

/** OpenAPI response entries for the listed error statuses, all using the error envelope. */
type ErrorResponseConfig = {
  description: string;
  content: { 'application/json': { schema: typeof errorEnvelopeSchema } };
};

export function errorResponses<S extends DocumentedErrorStatus>(
  ...statuses: S[]
): Record<S, ErrorResponseConfig> {
  const responses = {} as Record<S, ErrorResponseConfig>;
  for (const status of statuses) {
    responses[status] = {
      description: errorDescriptions[status],
      content: { 'application/json': { schema: errorEnvelopeSchema } },
    };
  }
  return responses;
}

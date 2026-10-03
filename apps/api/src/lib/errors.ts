import type { ErrorCode } from '@auren/contracts';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import type { ZodError } from 'zod';

/**
 * The one error type services throw. `onError` turns it into the error envelope (PLAN §9.7).
 * Only `message` and `details` reach the client, so never put internals in them.
 */
export class AppError extends Error {
  readonly status: ContentfulStatusCode;
  readonly code: ErrorCode;
  readonly details: unknown;

  constructor(
    status: ContentfulStatusCode,
    code: ErrorCode,
    message: string,
    details?: unknown,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export type ValidationIssue = { path: string; message: string; code: string };

export function zodIssues(error: ZodError): ValidationIssue[] {
  return error.issues.map((issue) => ({
    path: issue.path.map(String).join('.'),
    message: issue.message,
    code: issue.code,
  }));
}

/** Factories for the cross-cutting error classes. Domain modules add their own codes. */
export const errors = {
  validation: (issues: ValidationIssue[]) =>
    new AppError(400, 'VALIDATION_ERROR', 'The request is invalid.', { issues }),
  malformed: (message = 'The request body could not be parsed.') =>
    new AppError(400, 'MALFORMED_REQUEST', message),
  unauthenticated: () => new AppError(401, 'UNAUTHENTICATED', 'Authentication is required.'),
  forbidden: (details?: unknown) =>
    new AppError(403, 'FORBIDDEN', 'You do not have permission to do this.', details),
  crossOrigin: () =>
    new AppError(403, 'CROSS_ORIGIN_REQUEST', 'Cross-origin requests are not allowed.'),
  notFound: (what = 'Resource') => new AppError(404, 'NOT_FOUND', `${what} not found.`),
  routeNotFound: () => new AppError(404, 'ROUTE_NOT_FOUND', 'No such endpoint.'),
  conflict: (message = 'The request conflicts with the current state.', details?: unknown) =>
    new AppError(409, 'CONFLICT', message, details),
  staleWrite: () =>
    new AppError(409, 'STALE_WRITE', 'This record was changed by someone else. Reload and retry.'),
  invalidTransition: (from: string, to: string) =>
    new AppError(409, 'INVALID_STATE_TRANSITION', `Cannot change status from ${from} to ${to}.`, {
      from,
      to,
    }),
  concurrentUpdate: () =>
    new AppError(409, 'CONCURRENT_UPDATE', 'A concurrent update prevented this. Please retry.'),
  payloadTooLarge: () => new AppError(413, 'PAYLOAD_TOO_LARGE', 'The request body is too large.'),
  businessRule: (message: string, details?: unknown) =>
    new AppError(422, 'BUSINESS_RULE_VIOLATION', message, details),
  rateLimited: () => new AppError(429, 'RATE_LIMITED', 'Too many requests. Please slow down.'),
  internal: (cause?: unknown) =>
    new AppError(500, 'INTERNAL_ERROR', 'Something went wrong on our side.', undefined, { cause }),
  unavailable: (cause?: unknown) =>
    new AppError(503, 'SERVICE_UNAVAILABLE', 'The service is temporarily unavailable.', undefined, {
      cause,
    }),
};

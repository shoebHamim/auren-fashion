import type { ErrorEnvelope } from '@auren/contracts';
import type { Context, ErrorHandler, NotFoundHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { AppError } from '../lib/errors';
import { errors, isAppError } from '../lib/errors';
import type { Logger } from '../lib/logger';
import { mapDatabaseError } from '../lib/pg-errors';
import type { AppEnv } from '../types';

function fromHttpException(error: HTTPException): AppError {
  switch (error.status) {
    case 400:
      return errors.malformed();
    case 401:
      return errors.unauthenticated();
    case 403:
      return errors.forbidden();
    case 404:
      return errors.routeNotFound();
    case 413:
      return errors.payloadTooLarge();
    default:
      return error.status >= 500 ? errors.internal(error) : errors.malformed();
  }
}

export function toAppError(error: unknown): AppError {
  if (isAppError(error)) return error;
  if (error instanceof HTTPException) return fromHttpException(error);
  return mapDatabaseError(error) ?? errors.internal(error);
}

/** Accepts any context so built-in middleware callbacks (e.g. bodyLimit) can use it too. */
export function errorResponse(c: Context, error: AppError): Response {
  const requestId: unknown = c.get('requestId');
  const body: ErrorEnvelope = {
    error: {
      code: error.code,
      message: error.message,
      // 5xx details could leak internals; they go to the logs only.
      ...(error.status < 500 && error.details !== undefined ? { details: error.details } : {}),
      ...(typeof requestId === 'string' ? { requestId } : {}),
    },
  };
  return c.json(body, error.status);
}

/** Converts anything thrown into the error envelope; never leaks SQL, stacks or provider payloads. */
export function errorHandler(fallbackLog: Logger): ErrorHandler<AppEnv> {
  return (error, c) => {
    const appError = toAppError(error);
    const log = c.get('log') ?? fallbackLog;
    if (appError.status >= 500) {
      log.error({ err: appError.cause ?? error, code: appError.code }, 'request error');
    } else {
      log.debug({ code: appError.code, status: appError.status }, 'request rejected');
    }
    return errorResponse(c, appError);
  };
}

export const notFoundHandler: NotFoundHandler<AppEnv> = (c) =>
  errorResponse(c, errors.routeNotFound());

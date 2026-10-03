import { z } from 'zod';

/**
 * Machine-readable error codes shared by the API and the web app (PLAN §9.7).
 * Domain-specific codes (OUT_OF_STOCK, DISCOUNT_INVALID, …) are added with the phase that needs them.
 */
export const ERROR_CODES = [
  // 400
  'VALIDATION_ERROR',
  'MALFORMED_REQUEST',
  // 401
  'UNAUTHENTICATED',
  'SESSION_EXPIRED',
  'TWO_FACTOR_REQUIRED',
  'FRESH_SESSION_REQUIRED',
  // 403
  'FORBIDDEN',
  'CROSS_ORIGIN_REQUEST',
  'PRIVILEGE_ESCALATION',
  // 404
  'NOT_FOUND',
  'ROUTE_NOT_FOUND',
  // 409
  'CONFLICT',
  'STALE_WRITE',
  'INVALID_STATE_TRANSITION',
  'CONCURRENT_UPDATE',
  // 413 / 415
  'PAYLOAD_TOO_LARGE',
  'UNSUPPORTED_MEDIA_TYPE',
  // 422
  'BUSINESS_RULE_VIOLATION',
  'IDEMPOTENCY_KEY_REUSED',
  // 429
  'RATE_LIMITED',
  // 5xx
  'INTERNAL_ERROR',
  'SERVICE_UNAVAILABLE',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export const errorCodeSchema = z.enum(ERROR_CODES);

/** Every non-2xx response body has exactly this shape. */
export const errorEnvelopeSchema = z
  .object({
    error: z.object({
      code: errorCodeSchema,
      message: z.string(),
      details: z.unknown().optional(),
      requestId: z.string().optional(),
    }),
  })
  .meta({ id: 'ErrorEnvelope' });

export type ErrorEnvelope = z.infer<typeof errorEnvelopeSchema>;

export function isErrorEnvelope(value: unknown): value is ErrorEnvelope {
  return errorEnvelopeSchema.safeParse(value).success;
}

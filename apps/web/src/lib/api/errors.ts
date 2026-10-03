import { type ErrorCode, isErrorEnvelope } from '@auren/contracts';

/** A non-2xx API response, decoded from the standard error envelope (PLAN §9.7). */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode | 'UNEXPECTED_RESPONSE',
    message: string,
    readonly details?: unknown,
    readonly requestId?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Returns the parsed JSON body of a successful response, or throws `ApiError`. */
export async function readJson<T>(response: Response): Promise<T> {
  const body: unknown = await response.json().catch(() => undefined);
  if (response.ok) return body as T;
  if (isErrorEnvelope(body)) {
    const { code, message, details, requestId } = body.error;
    throw new ApiError(response.status, code, message, details, requestId);
  }
  throw new ApiError(
    response.status,
    'UNEXPECTED_RESPONSE',
    `Unexpected ${response.status} response`,
  );
}

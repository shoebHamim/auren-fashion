import type { Database } from '@auren/db';
import { describe, expect, it } from 'vitest';
import { buildTestApp } from '../test/app';

/** A database stub whose every query fails, as if Postgres were down. */
const unreachableDb = {
  execute: () => Promise.reject(Object.assign(new Error('connect'), { code: 'ECONNREFUSED' })),
} as unknown as Database;

describe('app (no database)', () => {
  const app = buildTestApp(unreachableDb);

  it('serves liveness with a generated request ID and security headers', async () => {
    const res = await app.request('/api/health');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'ok' });
    expect(res.headers.get('x-request-id')).toMatch(/^[0-9a-f-]{36}$/);
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
  });

  it('returns the error envelope for unknown routes, echoing the request ID', async () => {
    const res = await app.request('/api/nope', { headers: { 'X-Request-Id': 'req-123' } });
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({
      error: { code: 'ROUTE_NOT_FOUND', message: 'No such endpoint.', requestId: 'req-123' },
    });
  });

  it('rejects oversized bodies with 413', async () => {
    const res = await app.request('/api/health', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: 'x'.repeat(1024 * 1024 + 1),
    });
    expect(res.status).toBe(413);
    expect(await res.json()).toMatchObject({ error: { code: 'PAYLOAD_TOO_LARGE' } });
  });

  it('reports not ready (503) when the database is unreachable', async () => {
    const res = await app.request('/api/ready');
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({
      status: 'not_ready',
      checks: { database: { reachable: false } },
    });
  });

  it('exposes the OpenAPI document outside production only', async () => {
    expect((await app.request('/api/openapi.json')).status).toBe(200);
    const prod = buildTestApp(unreachableDb, { NODE_ENV: 'production' });
    expect((await prod.request('/api/openapi.json')).status).toBe(404);
  });
});

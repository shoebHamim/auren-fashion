import 'server-only';
import type { AppType } from '@auren/api/client';
import { hc } from 'hono/client';
import { headers } from 'next/headers';

const API_INTERNAL_URL = process.env.API_INTERNAL_URL ?? 'http://localhost:4000';

/**
 * Server Components / route handlers → API over the internal network (PLAN §4.1).
 * Forwards the visitor's cookies (session) and a request ID for log correlation (PLAN §24.1).
 * Dynamic: reading headers() means callers must render inside <Suspense>.
 */
export async function serverApi() {
  const incoming = await headers();
  const forwarded: Record<string, string> = {
    'x-request-id': incoming.get('x-request-id') ?? crypto.randomUUID(),
  };
  const cookie = incoming.get('cookie');
  if (cookie) forwarded.cookie = cookie;
  const forwardedFor = incoming.get('x-forwarded-for');
  if (forwardedFor) forwarded['x-forwarded-for'] = forwardedFor;

  return hc<AppType>(API_INTERNAL_URL, {
    headers: forwarded,
    fetch: (input: RequestInfo | URL, init?: RequestInit) =>
      fetch(input, { ...init, cache: 'no-store' }),
  });
}

/**
 * Cookie-less client for public, cacheable catalog reads inside `'use cache'` functions
 * (tagged and revalidated by the API — PLAN §4.7).
 */
export const publicApi = hc<AppType>(API_INTERNAL_URL);

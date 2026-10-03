import type { AppType } from '@auren/api/client';
import { hc } from 'hono/client';

/** Browser → same-origin `/api/*` (PLAN §4.1); session cookies flow automatically. */
export function browserApi() {
  return hc<AppType>(window.location.origin, { init: { credentials: 'same-origin' } });
}

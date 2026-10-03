import path from 'node:path';
import type { NextConfig } from 'next';

const apiInternalUrl = process.env.API_INTERNAL_URL ?? 'http://localhost:4000';

const config: NextConfig = {
  // PLAN §4.7: Next 16 caching model ('use cache' + cacheTag), dynamic data streamed in <Suspense>.
  cacheComponents: true,
  // PLAN §25.3: self-contained server for the Docker image; trace files from the monorepo root.
  output: 'standalone',
  outputFileTracingRoot: path.join(import.meta.dirname, '../..'),
  // Workspace packages ship TypeScript source.
  transpilePackages: ['@auren/contracts'],
  poweredByHeader: false,
  // PLAN §4.1 / §10.2: one public origin. In production the edge (Caddy) routes /api/* to the API;
  // in development Next forwards it, so the browser still sees same-origin cookies.
  rewrites() {
    if (process.env.NODE_ENV !== 'development') return Promise.resolve([]);
    return Promise.resolve([
      { source: '/api/:path*', destination: `${apiInternalUrl}/api/:path*` },
    ]);
  },
};

export default config;

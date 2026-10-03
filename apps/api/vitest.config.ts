import { defineConfig } from 'vitest/config';

/**
 * Two projects (PLAN §23.1):
 * - unit: pure logic, no I/O — `*.test.ts`
 * - integration: route → service → real PostgreSQL 18 (Testcontainers) — `*.int.test.ts`
 */
export default defineConfig({
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['src/**/*.test.ts'],
          exclude: ['**/*.int.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'integration',
          include: ['src/**/*.int.test.ts', 'test/**/*.int.test.ts'],
          globalSetup: ['test/global-setup.ts'],
          testTimeout: 30_000,
          hookTimeout: 120_000,
        },
      },
    ],
  },
});

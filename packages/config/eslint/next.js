import nextPlugin from '@next/eslint-plugin-next';
import { defineConfig } from 'eslint/config';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import { baseConfig } from './base.js';

/**
 * Flat config for the Next.js app.
 * Enforces the architectural boundary: the web app never talks to PostgreSQL (PLAN §6.2).
 *
 * @param {{ tsconfigRootDir: string }} options
 */
export function nextConfig({ tsconfigRootDir }) {
  return defineConfig(
    baseConfig({ tsconfigRootDir }),
    nextPlugin.configs['core-web-vitals'],
    reactHooks.configs.flat.recommended,
    {
      languageOptions: { globals: { ...globals.browser } },
      rules: {
        '@typescript-eslint/no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['@auren/db', '@auren/db/*', 'pg', 'drizzle-orm', 'drizzle-orm/*'],
                message: 'apps/web must not access the database. Call the API instead (PLAN §4.1).',
              },
              {
                group: ['@auren/api', '@auren/api/*'],
                allowTypeImports: true,
                message: 'Only type imports from @auren/api are allowed (typed hc client).',
              },
            ],
          },
        ],
      },
    },
  );
}

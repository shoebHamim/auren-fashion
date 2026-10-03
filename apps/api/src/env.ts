import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().min(1).max(65_535).default(4000),
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  WEB_ORIGIN: z.url(),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  DB_POOL_MAX: z.coerce.number().int().min(1).max(100).default(10),
  WORKER_CONCURRENCY: z.coerce.number().int().min(1).max(50).default(5),
});

export type Env = z.infer<typeof envSchema>;

/** Validates the environment at boot and fails fast with every problem listed (PLAN §25.3). */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  if (source === process.env && process.env.NODE_ENV !== 'production') {
    try {
      process.loadEnvFile(fileURLToPath(new URL('../../../.env', import.meta.url)));
    } catch {
      // no .env file — rely on the real environment
    }
  }
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const problems = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${problems}`);
  }
  return parsed.data;
}

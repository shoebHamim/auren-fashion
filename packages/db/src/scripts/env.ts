import { fileURLToPath } from 'node:url';

/** Loads the repo-root .env for local scripts; deployed environments set real env vars. */
export function loadRootEnv(): void {
  try {
    process.loadEnvFile(fileURLToPath(new URL('../../../../.env', import.meta.url)));
  } catch {
    // no .env file: rely on the process environment
  }
}

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable ${name}`);
  return value;
}

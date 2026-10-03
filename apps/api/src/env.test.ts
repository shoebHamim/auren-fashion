import { describe, expect, it } from 'vitest';
import { loadEnv } from './env';

const valid = {
  DATABASE_URL: 'postgres://app:app@localhost:5433/auren',
  WEB_ORIGIN: 'http://localhost:3100',
};

describe('loadEnv', () => {
  it('applies defaults to a minimal valid environment', () => {
    const env = loadEnv({ ...valid });
    expect(env).toMatchObject({ NODE_ENV: 'development', API_PORT: 4000, LOG_LEVEL: 'info' });
  });

  it('lists every problem at once', () => {
    expect(() => loadEnv({ DATABASE_URL: 'mysql://nope', API_PORT: 'abc' })).toThrow(
      /DATABASE_URL[\s\S]*API_PORT|API_PORT[\s\S]*DATABASE_URL/,
    );
  });
});

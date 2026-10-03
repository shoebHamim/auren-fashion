import { runAllMigrations } from '@auren/db/migrate';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import pg from 'pg';
import type { TestProject } from 'vitest/node';

export const TEMPLATE_DATABASE = 'auren_template';

declare module 'vitest' {
  export interface ProvidedContext {
    postgres: { adminUrl: string; templateDatabase: string };
  }
}

/**
 * Starts PostgreSQL 18 once per run, migrates a template database, and shares its location.
 * Each test file clones the template (`CREATE DATABASE … TEMPLATE`, ~100 ms) — PLAN §23.1.
 */
export default async function setup(project: TestProject) {
  const container: StartedPostgreSqlContainer = await new PostgreSqlContainer('postgres:18.6')
    .withDatabase('postgres')
    .withUsername('test')
    .withPassword('test')
    .start();
  const adminUrl = container.getConnectionUri();

  const admin = new pg.Client({ connectionString: adminUrl });
  await admin.connect();
  await admin.query(`CREATE DATABASE ${TEMPLATE_DATABASE}`);
  await admin.end();

  const templateUrl = new URL(adminUrl);
  templateUrl.pathname = `/${TEMPLATE_DATABASE}`;
  await runAllMigrations({ connectionString: templateUrl.toString() });

  project.provide('postgres', { adminUrl, templateDatabase: TEMPLATE_DATABASE });

  return async () => {
    await container.stop();
  };
}

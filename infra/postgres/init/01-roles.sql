-- Local development only. Production roles are provisioned with secrets by infra/deploy (PLAN §22.2).
-- auren_migrator owns the schema and runs migrations; auren_app gets DML only (grants are applied by migrations).
CREATE ROLE auren_migrator LOGIN PASSWORD 'auren_migrator';
CREATE ROLE auren_app LOGIN PASSWORD 'auren_app';

GRANT CONNECT, CREATE ON DATABASE auren TO auren_migrator;
GRANT CONNECT ON DATABASE auren TO auren_app;
ALTER SCHEMA public OWNER TO auren_migrator;

-- Not a trusted extension, so it is created here by the superuser (PLAN §24.1).
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Job queue (graphile-worker): its tables use row-level security that only the schema owner
-- bypasses, and the API enqueues jobs as auren_app — so auren_app creates and owns the
-- `graphile_worker` schema. That needs CREATE on the database (graphile-worker always runs
-- `CREATE SCHEMA IF NOT EXISTS`). auren_app still has no CREATE on `public`, where business data lives.
GRANT CREATE ON DATABASE auren TO auren_app;

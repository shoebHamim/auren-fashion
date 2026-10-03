#!/usr/bin/env bash
# Runs once, on first start of an empty data volume (PLAN §22.2).
# auren_migrator owns `public` and runs migrations; auren_app gets DML only (grants come from migrations)
# and owns the graphile-worker job schema.
set -euo pipefail

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  -v migrator_password="$AUREN_MIGRATOR_DB_PASSWORD" \
  -v app_password="$AUREN_APP_DB_PASSWORD" \
  -v db="$POSTGRES_DB" <<'SQL'
CREATE ROLE auren_migrator LOGIN PASSWORD :'migrator_password';
CREATE ROLE auren_app LOGIN PASSWORD :'app_password';
GRANT CONNECT, CREATE ON DATABASE :"db" TO auren_migrator;
GRANT CONNECT, CREATE ON DATABASE :"db" TO auren_app;
ALTER SCHEMA public OWNER TO auren_migrator;
REVOKE ALL ON SCHEMA public FROM PUBLIC;
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
SQL

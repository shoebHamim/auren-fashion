-- Platform setup (PLAN §8.1, §22.2). Runs as the migrator role, before any table exists.

-- Trusted extensions: creatable by the database owner/migrator without superuser.
CREATE EXTENSION IF NOT EXISTS citext;
--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS pg_trgm;
--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS unaccent;
--> statement-breakpoint

-- Least privilege: objects created by the migrator are usable by the app role for DML only.
-- Append-only tables later REVOKE UPDATE/DELETE explicitly. Skipped where the role doesn't
-- exist (e.g. throwaway test containers).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'auren_app') THEN
    GRANT USAGE ON SCHEMA public TO auren_app;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO auren_app;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO auren_app;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO auren_app;
  END IF;
END $$;

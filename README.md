# Auren

Online store and back office for a single fashion retailer.

- [`docs/PLAN.md`](docs/PLAN.md): architecture and scope (the source of truth)
- [`docs/PROGRESS.md`](docs/PROGRESS.md): what's done and what's next
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md): how the repo works today (packages, processes, connections, data flow)
- [`docs/DEPLOY.md`](docs/DEPLOY.md): production deployment (single VPS + Cloudflare)

## Stack

|         |                                                                                   |
| ------- | --------------------------------------------------------------------------------- |
| Web     | Next.js 16 (App Router, `cacheComponents`), React 19, Tailwind 4, shadcn/ui       |
| API     | Hono on Node 24, OpenAPI via `@hono/zod-openapi`, Zod 4                           |
| Data    | PostgreSQL 18 with Drizzle ORM; graphile-worker for background jobs               |
| Tooling | pnpm 11 workspaces, Turborepo, TypeScript 6, ESLint, Prettier, Vitest, Playwright |

## Getting started

Prerequisites: Docker, and nvm (or Node 24 installed some other way).

```bash
nvm install && nvm use      # Node 24 (from .nvmrc)
corepack enable             # pnpm version comes from package.json "packageManager"
pnpm install
cp .env.example .env
pnpm dev                    # starts infra, migrates, seeds, then api + worker + web
```

| URL                                    | What                                            |
| -------------------------------------- | ----------------------------------------------- |
| http://localhost:3100                  | Storefront (`/admin` is the back office)        |
| http://localhost:3100/api/health       | API, on the same origin through the dev rewrite |
| http://localhost:4000/api/openapi.json | OpenAPI document (non-production only)          |
| http://localhost:8025                  | Mailpit (catches all outgoing email)            |

Local infrastructure runs in Docker (`docker-compose.yml`): Postgres on **5433**, SeaweedFS S3 on **9000**, Mailpit on **8025/1025**.

## Common commands

| Command                                        |                                                                         |
| ---------------------------------------------- | ----------------------------------------------------------------------- |
| `pnpm dev`                                     | Everything, in watch mode                                               |
| `pnpm lint` · `pnpm typecheck` · `pnpm format` | Code quality                                                            |
| `pnpm test`                                    | Unit tests                                                              |
| `pnpm test:integration`                        | API + real PostgreSQL 18 through Testcontainers (Docker required)       |
| `pnpm test:e2e`                                | Playwright smoke tests (run `pnpm infra:up && pnpm db:migrate` first)   |
| `pnpm build`                                   | Production builds (API bundle and Next standalone)                      |
| `pnpm db:generate`                             | Create a migration from schema changes in `packages/db/src/schema`      |
| `pnpm db:migrate` · `pnpm db:seed`             | Apply migrations / base seed to the local database                      |
| `pnpm infra:up` · `pnpm infra:down`            | Start / stop local infrastructure (`docker compose down -v` wipes data) |

## Layout

```text
apps/api        Hono API, worker and migrate entrypoints (the only code that touches the database)
apps/web        Next.js storefront and admin (talks to the API only)
packages/db     Drizzle schema, SQL migrations, client, seeds
packages/contracts  Zod schemas, error codes, money helpers shared by API and web
packages/config tsconfig, ESLint and Prettier presets
infra/          Local dev infra config and the production deploy stack
```

Conventions (commit format, boundaries, catalog-only dependency versions) are in [`CLAUDE.md`](CLAUDE.md).

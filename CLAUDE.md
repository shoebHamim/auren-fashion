# Auren — working agreement

- `docs/PLAN.md` is the source of truth for architecture and scope. Don't deviate from it silently. Propose changes first, and once they're approved, update PLAN.md and add a dated entry to §29.1.
- `docs/PROGRESS.md` tracks implementation:
  - At the start of a session, read it to find the current phase and the next unchecked task.
  - When a task is done (code merged, tests passing), tick it, add the commit or PR reference, update the phase summary table, and add a Log line.
  - Mark work in progress with 🚧 and blocked work with ⛔ plus the reason.
- `docs/ARCHITECTURE.md` describes the system **as built**. Update it in the same change whenever packages, processes, connections, schemas/roles, env variables or the build/deploy flow change.
- Work phase by phase. Don't start a phase until the exit criteria of the phases it depends on are ticked, unless the user says otherwise.
- When an open question (Q1–Q18) is answered, record the answer in PROGRESS.md and update the affected PLAN.md section.

## Conventions

- **Commits** follow Conventional Commits, with the task ID in the subject: `feat(api): P0-08 error envelope and health endpoints`. Types: `feat`, `fix`, `chore`, `docs`, `test`, `refactor`, `ci`, `build`. Scope: the app, package or module.
- **Toolchain:** Node 24 (`nvm use`) and pnpm 11 via corepack. Every dependency version lives in the catalog in `pnpm-workspace.yaml`; packages reference it as `"catalog:"`.
- **Layout:** `apps/web` must never import `@auren/db`, `pg` or `drizzle-orm` (enforced by ESLint). Only `import type` from `@auren/api` is allowed.
- **Framework versions are newer than training data.** Before changing Turborepo or Next.js config or APIs, read the bundled docs as described in @AGENTS.md (Turborepo) and `apps/web/AGENTS.md` (Next.js). Both files are tool-managed; keep them committed.

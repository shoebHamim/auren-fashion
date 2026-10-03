# Auren Implementation Progress

> Tracks execution of [`PLAN.md`](./PLAN.md). PLAN.md says **what and why**; this file says **what's done and what's next**.
> Last updated: 2026-10-03 (Phase 0)

## How to use this file

- **Tasks:** `- [ ]` todo → `- [x]` done. A task is done when its code is merged, its tests pass and CI is green. Append the commit or PR reference: `- [x] P1-04 … — #23` or `(a1b2c3d)`.
- **In progress:** add `🚧` at the start of the line. Aim for one in-progress task per developer.
- **Blocked:** add `⛔` and the reason (for example `⛔ waiting on Q1`).
- **A phase is Done only when every exit criterion is ticked**, not just its tasks.
- **Scope changes:**
  1. Update PLAN.md first, and log the decision in PLAN.md §29.1.
  2. Then add or remove tasks here.
  3. Don't delete tasks that were dropped. Strike them through instead, with a reason: `~~P4-08 …~~ (moved to post-MVP, 2026-11-02)`.
- **Quick count:** `grep -c -- '- \[x\]' docs/PROGRESS.md` (done) and `grep -c -- '- \[ \]' docs/PROGRESS.md` (remaining).

## Phase summary

| Phase | Status | Tasks | Started | Completed | Notes |
|---|---|---|---|---|---|
| 0 Foundations | In progress | 12/13 | 2026-10-03 | | Blocked on: push for CI, VPS + domain for P0-13 |
| 1 Identity, staff, RBAC & audit | Not started | 0/12 | | | |
| 2 Catalog & media | Not started | 0/11 | | | |
| 3 Inventory | Not started | 0/11 | | | Decide online safety buffer (R1) |
| 4 Storefront & account | Not started | 0/9 | | | |
| 5 Cart, checkout, COD orders & fulfillment | Not started | 0/16 | | | Needs Q2, Q4, Q7, Q8 |
| 6 Payment gateway | Not started | 0/10 | | | **Blocked until Q1** |
| 7 Invoices & credit notes | Not started | 0/7 | | | Needs Q3 (accountant) |
| 8 Returns & refunds | Not started | 0/8 | | | Needs Q10 |
| 9 Discounts | Not started | 0/5 | | | Can run in parallel with 6–8 |
| 10 Dashboard & reports | Not started | 0/5 | | | |
| 11 Launch hardening | Not started | 0/10 | | | Needs Q5, Q6 |
| 12 POS (post-MVP) | Not started | — | | | Tasks added after launch |

Status values: `Not started` · `In progress` · `Blocked` · `Done`

---

## Phase 0: Foundations (PLAN §26 · §5 · §6)

- [x] P0-01 `git init` (by the owner), `.gitignore`, `.editorconfig`, `.gitattributes`, commit convention (in CLAUDE.md)
- [x] P0-02 Install Node 24 LTS locally (v24.21.0 via nvm; pnpm 11.28.3 via corepack); add `.nvmrc`, `engines` + `engineStrict`, `packageManager`
- [x] P0-03 pnpm workspace (catalogs with `catalogMode: strict`, `allowBuilds`, `minimumReleaseAge` + exclusions) and Turborepo pipeline (dev, build, lint, typecheck, test)
- [x] P0-04 `packages/config`: tsconfig bases, ESLint flat config (type-aware promise rules), Prettier. Pinned versions re-verified (**TS 6.0.x instead of 7**, logged in PLAN §29.1)
- [x] P0-05 `docker-compose.yml`: postgres:18.6 (port 5433), Mailpit, and **SeaweedFS** instead of MinIO for local S3 (MinIO images are no longer published; production uses R2). `pnpm infra:up` creates both buckets
- [x] P0-06 `packages/db`: Drizzle config (`casing: snake_case`), client factory, migrate scripts (Drizzle + graphile-worker schema + app grants)
  - [x] Custom SQL migration: extensions and default grants. The roles themselves are created by infra (`infra/postgres/init` locally; the VPS provisioning script in P0-13), because they need secrets
  - [x] `store_settings` singleton
  - [x] `seed:base` skeleton (runs as `auren_app`, which proves the DML grants)
- [x] P0-07 `packages/contracts`: error codes + envelope schema, money helpers (BigInt intermediates, half-up rounding, largest-remainder `allocate`, exact parse/format; 25 unit tests), pagination schemas
- [x] P0-08 `apps/api` skeleton (plus a tsup production bundle: `dist/server.js`, `dist/migrate.js`)
  - [x] Env validation, pino logger (JSON in production, redaction), request ID (UUID v7; echoes `X-Request-Id`)
  - [x] `AppError` + `onError` envelope (with Postgres error mapping and a constraint→code registry), body limit → 413
  - [x] OpenAPIHono root under `/api`, with a Zod `defaultHook` → `VALIDATION_ERROR`
  - [x] `/api/health`, `/api/ready` (DB reachable and migrations up to date), `/api/openapi.json` (non-production only)
  - [x] Transaction helper with 40001/40P01 retry
- [x] P0-09 Worker entrypoint: graphile-worker (runs as `auren_app`, which owns the job schema), crontab (`system:heartbeat` every minute → `system_heartbeats`), transactional `enqueueJob(tx, …)` (verified: a rolled-back transaction leaves no job), graceful shutdown, payload-free job logs
- [x] P0-10 `apps/web` skeleton (dev on port 3100; standalone output)
  - [x] Next 16.3 (`cacheComponents`), Tailwind 4, shadcn (Radix base, nova preset, Geist font)
  - [x] Storefront and admin layout shells (admin `noindex`; system-status card streams in `<Suspense>` = partial prerender)
  - [x] Dev rewrites `/api` → API (verified: `Set-Cookie`, `Origin`, `Cookie` and bodies pass through)
  - [x] Server fetch helper (forwards cookies, request ID and `x-forwarded-for`, `no-store`) + cookie-less `publicApi` for cached reads
  - [x] Typed `hc` clients (type-only import of `AppType`; the ESLint boundary rule bans DB imports in web), plus an `ApiError`/`readJson` envelope decoder
- [x] P0-11 Test harness: Vitest projects (`unit` / `integration`), Testcontainers PG 18 with a migrated **template DB** cloned per test file (`createTestDatabase`, `resetDatabase`), Playwright smoke test (Chromium; starts or reuses api + web). Current suites: contracts 25 unit; api 22 unit + 8 integration (incl. a real 40001 retry and transactional enqueue); web 3 e2e
- [x] P0-12 CI: `.github/workflows/ci.yml`. Jobs: `checks` (format, lint, typecheck, unit, build), `migrations` (no drift + `drizzle-kit check`), `integration` (Testcontainers), `e2e` (compose infra + Playwright). Every job's commands verified locally; the first GitHub run needs a push
- [ ] 🚧 P0-13 Dockerfiles (`turbo prune`, standalone output) and a staging deploy with edge path routing
  - [x] `apps/api/Dockerfile` (one image for the server, worker and `dist/migrate.js`) and `apps/web/Dockerfile` (Next standalone), non-root, Node 24.21-slim
  - [x] `infra/deploy/`: production Compose (Caddy, web, api, worker, a one-shot `migrate` that gates the api, Postgres with no public port), Caddyfile (path routing, `/_internal` → 404, Cloudflare `trusted_proxies`, origin cert), role provisioning script, `.env.example`. **Verified locally end to end** through Caddy on :8080
  - [x] Runbook: `docs/DEPLOY.md`
  - [ ] ⛔ Deploy to the VPS. Needs VPS SSH access, a domain on Cloudflare and an origin certificate (Q12 follow-up)

**Exit criteria**
- [x] `pnpm dev` starts web, api, worker and the local infrastructure (it also migrates and seeds)
- [ ] CI green. ⛔ Needs a push to GitHub; every job passes locally
- [ ] Staging deployed. ⛔ Needs the VPS and domain. For now the deploy is `git pull` + `compose up --build` on the VPS (DEPLOY.md); CI-built images come later
- [ ] A cookie set by `/api/*` is visible to the web app on the same origin in staging. Verified locally through both the Next dev rewrite and the production Caddy stack; staging pending

## Phase 1: Identity, staff, RBAC & audit (PLAN §10 · §21)

- [ ] P1-01 Better Auth config in `packages/auth`
  - [ ] Drizzle adapter, `usePlural`, uuidv7 IDs
  - [ ] Cookie prefix, `trustedOrigins`
  - [ ] DB rate-limit storage, trusted proxies
  - [ ] Generate the auth schema and its migration
- [ ] P1-02 Mount `/api/auth/*`; export the auth client for the web app
- [ ] P1-03 Customer sign-up, sign-in, verify and reset; create a `customers` row on sign-up; auth emails through the worker
- [ ] P1-04 Tables: `staff_members`, `staff_invites`, `roles`, `role_permissions`, `audit_logs` (append-only trigger), `idempotency_keys`
- [ ] P1-05 Permission catalog in contracts; seed the default roles and permission matrix (PLAN §10.5)
- [ ] P1-06 Middleware
  - [ ] `session`, `originCheck`, `rateLimit`
  - [ ] `requireStaff` (active + 2FA + 12 h + no cookie cache)
  - [ ] `requirePermission`
  - [ ] Fresh-session helper
  - [ ] `idempotent`
- [ ] P1-07 `audit.record` and a diff helper with redaction
- [ ] P1-08 Staff invite flow, `create-owner` CLI, enforced TOTP enrolment
- [ ] P1-09 Staff and role management API (no-escalation rule, last-owner rule, session revocation on suspend)
- [ ] P1-10 Admin UI: login + 2FA enrolment, permission-aware shell, staff and roles screens, audit viewer
- [ ] P1-11 Storefront auth pages (login, register, verify, forgot, reset) and `/store/me`
- [ ] P1-12 Tests: auth flows, **role × route matrix harness**, escalation and last-owner rules, revocation, origin check

**Exit criteria**
- [ ] An owner invites a manager, who must enrol 2FA before any access
- [ ] Forbidden actions return 403 and write nothing (tested)
- [ ] Every staff action in this phase appears in the audit log

## Phase 2: Catalog & media (PLAN §11 · §4.6)

- [ ] P2-01 Store settings API and UI; `tax_rates` (by tax class, `valid_from`)
- [ ] P2-02 Catalog schema with all PLAN §8.3 constraints
  - [ ] `brands`, `categories`, `tags`, `product_tags`, `size_charts`
  - [ ] `attributes`, `attribute_values`
  - [ ] `products`, `product_categories`, `product_attributes`
  - [ ] `product_variants`, `variant_attribute_values`
  - [ ] `media_assets`, `product_images`
- [ ] P2-03 Seed the colour and size attributes
- [ ] P2-04 `StorageService` (S3 adapter): presigned upload, then complete and verify (type, size, magic bytes)
- [ ] P2-05 Category tree service (depth ≤ 3, cycle check, in-memory cache)
- [ ] P2-06 Product service
  - [ ] CRUD, variant matrix generator, `option_key`
  - [ ] SKU and barcode uniqueness
  - [ ] Publish, archive, restore and delete rules
  - [ ] Optimistic concurrency (`version`)
- [ ] P2-07 Variant pricing: price, compare-at, cost (permission-gated), bulk edit, `variant.price_changed` audit
- [ ] P2-08 Search vector maintenance (tsvector custom type) and trigram index
- [ ] P2-09 Admin catalog and media API routes (PLAN §9.5)
- [ ] P2-10 Admin UI
  - [ ] Product list (search by name, SKU or barcode)
  - [ ] Product editor with variant grid
  - [ ] Image manager with colour tagging
  - [ ] Categories, brands, tags, attributes and size charts
  - [ ] Settings
- [ ] P2-11 Tests: `option_key` uniqueness, composite FK, publish rules, price audit diff, cost hidden without permission, upload validation, archive vs delete

**Exit criteria**
- [ ] "Oversized Cotton T-Shirt" (3 colours × 4 sizes, images per colour) created and published
- [ ] Its price change history is visible in the audit log

## Phase 3: Inventory (PLAN §12)

- [ ] P3-01 Schema: `stock_locations` (seed the default), `inventory_levels` (generated `available`), `inventory_movements` (append-only), `inventory_reservations`, `stock_receipts`
- [ ] P3-02 Auto-create `inventory_levels` per variant at the default location
- [ ] P3-03 Service primitives: reserve, release and commit (conditional UPDATE, sorted locks); adjust; count correction
- [ ] P3-04 Stock receipts (multi-line)
- [ ] P3-05 Adjustments with reasons and required notes; oversold detection and alert
- [ ] P3-06 Quick stock-out by barcode scan (`in_store_sale`). Decide the online safety buffer with the owner (R1)
- [ ] P3-07 Low-stock thresholds
- [ ] P3-08 Opening-balance CSV import (dry run + report)
- [ ] P3-09 Nightly reconciliation job (invariants I1 and I2), plus an invariant checker reusable in tests
- [ ] P3-10 Admin UI: inventory list (low/out filters), variant stock drawer, receive, adjust, quick stock-out, import
- [ ] P3-11 Tests: randomized-sequence invariants, negative stock, **20 parallel attempts at the last unit**, deadlock-free multi-line reservations, oversold flag

**Exit criteria**
- [ ] Every `on_hand` change has a movement with actor, reason and reference
- [ ] The invariant checker passes; the race tests are green

## Phase 4: Storefront & customer account (PLAN §11.2–11.4 · §4.7)

- [ ] P4-01 Store catalog API: categories, listing (filters, sort, pagination, facets), product detail, availability
- [ ] P4-02 `CatalogSearch` interface + Postgres implementation (FTS + trigram + facets); `/store/search`
- [ ] P4-03 Store DTOs carry no cost or internal fields, with a contract test
- [ ] P4-04 Pages
  - [ ] Home
  - [ ] Category (filters, sort, pagination)
  - [ ] Product detail: colour gallery, variant selector, availability island, size chart, sale price, related products
  - [ ] Search
- [ ] P4-05 Caching: `'use cache'` + `cacheTag`; `storefront.revalidate` job → signed `/_internal/revalidate`
- [ ] P4-06 SEO
  - [ ] `generateMetadata`
  - [ ] JSON-LD (`Product`, `Offer`, `BreadcrumbList`)
  - [ ] Sitemap and robots
  - [ ] Canonical and noindex rules
  - [ ] 410 for archived products
- [ ] P4-07 Account: profile, addresses (`customer_addresses`)
- [ ] P4-08 Accessibility (WCAG 2.2 AA) and responsive baseline
- [ ] P4-09 Tests: filter correctness, search fixtures, revalidation after a price edit, Lighthouse CI budget on product and category pages

**Exit criteria**
- [ ] The published catalog is browsable
- [ ] A price edit is live on the product page within seconds
- [ ] LCP < 2.5 s on staging; the sitemap validates

## Phase 5: Cart, checkout, COD orders & fulfillment (PLAN §13 · §14.6)

- [ ] P5-01 Schema
  - [ ] `carts`, `cart_lines`
  - [ ] `shipping_methods`
  - [ ] `orders` (+ `order_number` sequence), `order_lines`, `order_addresses`, `order_discounts`
  - [ ] `shipments`, `shipment_lines`
  - [ ] `payments`, `payment_transactions`
- [ ] P5-02 Pricing engine (pure)
  - [ ] Line totals and shipping
  - [ ] Tax per rate group
  - [ ] Largest-remainder allocation and rounding setting
  - [ ] Unit tests
- [ ] P5-03 Cart: guest cookie token, add/update/remove, soft stock checks, price-changed notice, merge on login
- [ ] P5-04 Shipping methods (admin and store endpoints)
- [ ] P5-05 Checkout quote endpoint
- [ ] P5-06 Place-order transaction (idempotency, cart lock, guest customer upsert, reprice with `expected_total`, reserve, COD payment, audit, jobs)
- [ ] P5-07 COD settings: enable, maximum amount, review toggle (`on_hold`)
- [ ] P5-08 State machines (transition maps + compare-and-set) for order, payment and fulfillment status
- [ ] P5-09 Guest order tokens and lookup; customer order history and detail; customer cancellation
- [ ] P5-10 Admin orders: list, detail with timeline, confirm/hold, cancel, address edit
- [ ] P5-11 Fulfillment: create shipment (commit reservations, `sale` movements); shipped, delivered, failed and RTO (`rto_restock`, void COD)
- [ ] P5-12 COD collection (single and bulk with settlement reference); `issueIfDue` invoice hook stub
- [ ] P5-13 Jobs: reservation sweeper, unpaid-order cancellation
- [ ] P5-14 Emails: placed, shipped, delivered, cancelled
- [ ] P5-15 UI
  - [ ] Cart
  - [ ] Checkout (address, shipping, COD) and confirmation
  - [ ] Account orders
  - [ ] Admin orders and fulfillment
  - [ ] Packing slip
- [ ] P5-16 Tests: **E2E guest COD purchase → ship → collect**, last-item race, double submit, `PRICE_CHANGED`, cancel releases stock, RTO restock, invariant checker after each test

**Exit criteria**
- [ ] A full COD lifecycle on staging has the correct ledger, reservation, payment, status and audit state at every step

## Phase 6: Online payment gateway (PLAN §14)

- [ ] P6-01 Choose the provider and get a sandbox account ⛔ Q1
- [ ] P6-02 Finalize the `PaymentProvider` interface; bring the fake provider to parity
- [ ] P6-03 Gateway adapter: `createPayment`, webhook verify/parse, `fetchPayment`, `refund`, `void`
- [ ] P6-04 `webhook_events` inbox, `/api/webhooks/{provider}`, processing job
- [ ] P6-05 Payment session after commit; return page with polling; payment retry endpoint
- [ ] P6-06 Prepaid reservation TTL; late payment → `on_hold`
- [ ] P6-07 Stale-pending poller
- [ ] P6-08 Refunds core (`refunds`, `refund_lines`, execution job); cancelling a paid order triggers a refund
- [ ] P6-09 Admin payment panels and exception views; a toggle to disable the gateway
- [ ] P6-10 Tests
  - [ ] Signature verification
  - [ ] Five concurrent duplicate deliveries → one capture
  - [ ] Out-of-order events
  - [ ] Amount mismatch
  - [ ] Late payment (both outcomes)
  - [ ] Retry
  - [ ] Cancel + refund
  - [ ] Manual end-to-end run in the sandbox

**Exit criteria**
- [ ] Sandbox payments succeed, fail and retry correctly
- [ ] Duplicate webhooks are provably harmless
- [ ] Refunds reach the sandbox

## Phase 7: Invoices & credit notes (PLAN §16)

- [ ] P7-01 Get the accountant's input on invoice rules ⛔ Q3
- [ ] P7-02 Schema: `invoices` (`kind`), `invoice_lines`, `document_counters`, immutability triggers and grants
- [ ] P7-03 `issueIfDue` (prepaid at shipment, COD at collection), gapless numbering, snapshots
- [ ] P7-04 PDF rendering job, private storage, signed download
- [ ] P7-05 Credit notes when a refund succeeds on an invoiced order
- [ ] P7-06 Admin invoice list, detail, download and reprint (audited); CSV export; customer download; link in email
- [ ] P7-07 Tests: concurrent gapless numbering, UPDATE/DELETE rejected, totals match the order, PDF snapshot, no credit note without an invoice

**Exit criteria**
- [ ] The accountant has signed off a sample invoice and credit note
- [ ] Numbering verified gapless under load

## Phase 8: Returns & refunds (PLAN §17)

- [ ] P8-01 Schema: `return_requests` (+ `return_number` sequence), `return_lines`
- [ ] P8-02 Eligibility: window, returnable flag, returnable quantity checked under the order lock
- [ ] P8-03 Customer return request (account and guest link)
- [ ] P8-04 Staff returns: create, approve/reject/cancel, receive with condition and disposition
- [ ] P8-05 Refund calculation (k of n units, tax split, optional shipping) and the refund dialog
- [ ] P8-06 Refund methods: gateway API; manual (bank, mobile, cash) with an external reference; goodwill refunds; retry of failed refunds
- [ ] P8-07 Return and refund emails; return and refund reports
- [ ] P8-08 Tests: E2E return of 1 of 2 items → refund → credit note → stock; concurrent refund cap; over-return; rounding; write-off leaves `on_hand` unchanged

**Exit criteria**
- [ ] Every PLAN §17 rule is covered by a test
- [ ] Finance has signed off the refund documents

## Phase 9: Discounts (PLAN §19)

- [ ] P9-01 Schema: `discounts`, `discount_targets`, `discount_redemptions`
- [ ] P9-02 Discount engine (pure, with table-driven tests)
- [ ] P9-03 Integration in cart, quote and checkout; redemption and usage increment; release on cancel or expiry
- [ ] P9-04 Admin discount editor and usage stats; rate-limited code entry
- [ ] P9-05 Tests: allocation exactness, concurrent redemption at the limit, release, refunds with allocated discounts

**Exit criteria**
- [ ] A 20%-off category coupon with a usage limit behaves correctly under concurrency

## Phase 10: Dashboard & reports (PLAN §20)

- [ ] P10-01 Metric definitions (PLAN §20.1) with a `storeDay()` timezone helper
- [ ] P10-02 Dashboard API and UI (sales, operations, inventory, products, customers)
- [ ] P10-03 Reports with CSV export
- [ ] P10-04 System status page
- [ ] P10-05 Tests: golden fixtures, midnight and DST edges, permission gating, performance on 100k synthetic orders

**Exit criteria**
- [ ] The dashboard matches a hand-computed fixture
- [ ] Dashboard p95 < 1 s

## Phase 11: Launch hardening (PLAN §22 · §25)

- [ ] P11-01 Security review against the PLAN §22 checklist; tune CSP and rate limits
- [ ] P11-02 Load tests (checkout of scarce items, browsing), with results saved in `docs/`
- [ ] P11-03 Backups configured; restore drill passed
- [ ] P11-04 Alerts wired up; test alerts fired
- [ ] P11-05 Data import: products, variants, images, opening stock, then a physical count ⛔ Q5
- [ ] P11-06 Legal pages: terms, privacy, returns policy
- [ ] P11-07 Email deliverability (SPF, DKIM, DMARC)
- [ ] P11-08 Runbooks: DB restore, payment provider down
- [ ] P11-09 UAT with staff on staging
- [ ] P11-10 Production deploy and go-live checklist

**Exit criteria**
- [ ] The owner has signed off the go-live checklist
- [ ] The restore drill passed and alerts are verified

## Post-MVP

- Phase 12, POS (PLAN §15): break down into tasks once Phase 11 is done
- Phase 13+, extensions: see PLAN §28.1 (pick items by measured demand)

---

## Open questions (PLAN §30.2)

| # | Topic | Needed by | Status | Answer / decision |
|---|---|---|---|---|
| Q1 | Country, currency, payment gateway | End of Phase 5 (blocks P6) | Open | |
| Q2 | Tax rules | Phase 5 | Open | |
| Q3 | Invoice legal requirements | Phase 7 | Open | |
| Q4 | Shipping zones, couriers, pickup | Phase 5 | Open | |
| Q5 | Existing data and barcodes | Phase 3 (import), Phase 11 | Open | |
| Q6 | Data retention and privacy law | Phase 11 | Open | |
| Q7 | Email/phone requirements at checkout | Phase 5 | Open | |
| Q8 | COD policy (review, maximum, fee) | Phase 5 | Open | |
| Q9 | Late payment with no stock | Phase 6 | Open | Default: manual (`on_hold`) |
| Q10 | Return policy details | Phase 8 | Open | |
| Q11 | Languages | Phase 4 | Open | |
| Q12 | Hosting and domain | Phase 0 | **Answered** (domain still open) | Single VPS with Docker Compose (Postgres self-hosted) plus Cloudflare R2 and CDN. See PLAN §25.2.1 |
| Q13 | Team size and timeline | Phase 0 | Open | |
| Q14 | Staff 2FA, shared devices | Phase 1 | Open | |
| Q15 | Catalog size and traffic | Phase 4 | Open | |
| Q16 | Marketing integrations and consent | Phase 11 | Open | |
| Q17 | Gift cards, preorders, backorders | Phase 5 | Open | |
| Q18 | Manager role scope | Phase 1 | Open | |

When a question is answered: fill in this row, update the matching PLAN.md section, and add a §29.1 log entry if it changes a decision.

---

## Log

Newest first. One line per notable event: phase started or finished, scope change, decision, blocker.

- 2026-10-03: Added `docs/ARCHITECTURE.md` (the as-built system overview with diagrams).
- 2026-10-03: P0-10–P0-12 done; P0-13 artifacts built and verified locally (deploy blocked on VPS + domain). Phase 0 remains open for the first CI run and the VPS deploy.
- 2026-10-03: P0-05–P0-09 done. Deviations, all recorded in PLAN: SeaweedFS replaces MinIO locally (MinIO images are discontinued); `auren_app` owns the graphile-worker schema (row-level security), see PLAN §22.2; task names use `module:action`.
- 2026-10-03: Phase 0 started. Hosting decided: single VPS plus Cloudflare R2 (Q12). Using TypeScript 6.0.x because typescript-eslint doesn't support TS 7 yet. P0-01–P0-04 done.
- 2026-10-03: PLAN.md reviewed by the owner. Progress tracker created. Next up: Phase 0 (after Node 24 install, Q12, Q13).

# Deploying Auren (single VPS + Cloudflare)

This runbook covers the launch architecture in [PLAN §25.2.1](./PLAN.md): one VPS running Docker Compose (Caddy, web, api, worker, Postgres), Cloudflare in front, and Cloudflare R2 for files. Everything lives in `infra/deploy/`.

```text
Browser ──HTTPS──▶ Cloudflare (DNS proxy, CDN) ──HTTPS (origin cert)──▶ Caddy :443
                                                                      ├─ /api/*   → api:4000
                                                                      ├─ /_internal/* → 404
                                                                      └─ /*       → web:3000 ──internal──▶ api:4000
api / worker / migrate ──▶ postgres:5432 (internal network only)
```

## 1. One-time VPS setup

1. **Server:** Ubuntu LTS, at least 2 vCPU / 4 GB RAM (the Next.js build needs about 2 GB). Enable unattended security upgrades.
2. **Access:** SSH keys only (`PasswordAuthentication no`). Create a non-root deploy user in the `docker` group.
3. **Firewall:**
   - allow 22, 80 and 443
   - once Cloudflare is live, restrict 80 and 443 to [Cloudflare's IP ranges](https://www.cloudflare.com/ips/)
4. **Docker:** install Docker Engine plus the Compose plugin. Turn on log rotation, which the stack already sets per container.
5. **Code:** clone the repository to `/opt/auren`.

## 2. Cloudflare

1. Add the domain to Cloudflare. Create a **proxied** (orange-cloud) `A` record pointing to the VPS IP.
2. Set **SSL/TLS** to **Full (strict)**.
3. Go to **SSL/TLS → Origin Server → Create certificate** for the domain. Save the files as:
   - `infra/deploy/certs/origin.pem`
   - `infra/deploy/certs/origin-key.pem` (mode `600`; gitignored)
4. Under **R2**, create the buckets `auren-public-media` (with a custom domain such as `media.<domain>`), `auren-private-docs` and `auren-backups`. Create API tokens scoped per bucket. These are used from Phase 2 onwards.

## 3. Configure

```bash
cd /opt/auren
cp infra/deploy/.env.example infra/deploy/.env   # then fill every value
chmod 600 infra/deploy/.env
```

`WEB_ORIGIN` must be the exact public origin, for example `https://auren.example`. The API rejects mutations from any other origin.

## 4. First deploy and later updates

```bash
cd /opt/auren
git pull
docker compose -f infra/deploy/compose.yml --env-file infra/deploy/.env up -d --build
```

On every `up`:
1. The images are built.
2. `migrate` applies all pending migrations as `auren_migrator`. If it fails, `api` and `worker` don't start, and the previous containers keep serving.
3. `api` must pass `/api/ready` before `web` and `caddy` start.

On the very first start of an empty database volume, `infra/deploy/postgres-init/10-roles.sh` creates the `auren_migrator` and `auren_app` roles.

**Check the deploy:**

```bash
curl -fsS https://<domain>/api/ready      # {"status":"ready",…}
docker compose -f infra/deploy/compose.yml --env-file infra/deploy/.env ps
docker compose -f infra/deploy/compose.yml --env-file infra/deploy/.env logs -f api worker
```

**Rollback:** check out the previous commit and run the same `up -d --build`. Migrations are written expand/contract (PLAN §8.7), so the previous version still runs against the newer schema.

## 5. Operations

| Task | Command (from `/opt/auren`) |
|---|---|
| psql shell (superuser) | `docker compose -f infra/deploy/compose.yml --env-file infra/deploy/.env exec postgres psql -U postgres -d auren` |
| Manual backup (until automated backups land in Phase 11) | `docker compose -f infra/deploy/compose.yml --env-file infra/deploy/.env exec -T postgres pg_dump -U postgres -Fc auren > auren-$(date +%F).dump`, then copy it off the server |
| Restart one service | `… restart api` |
| Disk usage | `docker system df` |

## 6. Not automated yet

| Item | Phase |
|---|---|
| Nightly `pg_dump` to R2, WAL-G point-in-time recovery, quarterly restore drill | P11-03 |
| Building images in CI and pushing to a registry (instead of building on the VPS) | When build time on the VPS hurts |
| Staging environment (second Compose project or VPS, `-p auren-staging`) | When UAT starts |
| Uptime monitoring and alerting | P11-04 |

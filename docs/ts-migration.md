# TypeScript Migration – Production Cutover

The TypeScript app implements the full migration plan and can run as the sole backend.

## Run in Docker (no PostgreSQL installed)

If you don’t have PostgreSQL on your machine, use Docker: Postgres and the TS app run in containers.

**Start everything (Postgres + migrations + TS app):**

```bash
docker compose up --build postgres ts-app
```

Compose will:
1. Start **Postgres** (no install needed).
2. Run **TS migrations** once (`ts-db-init`), then exit.
3. Start the **TS app** (`ts-app`) on port 3000.

Then open: http://localhost:3000/ (landing), http://localhost:3000/health, http://localhost:3000/mcp, http://localhost:3000/a2a, http://localhost:3000/admin.

**Option A – With docker-compose (TS app + Postgres)**

```bash
# Start Postgres and the TS app (migrations must exist; run db-init first if using full compose)
docker compose up --build ts-app postgres
```

Then open:

- http://localhost:3000/ — landing
- http://localhost:3000/health — health check
- http://localhost:3000/mcp — MCP (POST/GET)
- http://localhost:3000/a2a — A2A (POST JSON-RPC)
- http://localhost:3000/admin — Admin UI

The `ts-app` service uses `DATABASE_URL=postgresql://adcp_user:secure_password_change_me@postgres:5432/adcp`. To create the schema with **TypeScript migrations** (no Python needed):

1. **Generate** migration SQL from the Drizzle schema (once):  
   `npm run db:generate`
2. **Apply** migrations:  
   `npm run db:migrate`  
   (Or in Docker: run the same inside the container or as a step before starting the app.)

**Scripts:**

| Script | Purpose |
|--------|--------|
| `npm run db:generate` | Generate migration SQL from `src/db/schema.ts` into `./drizzle/` (run once after schema changes). |
| `npm run db:migrate` | Apply pending migrations in `./drizzle/` to the DB (uses `DATABASE_URL`). |
| `npm run db:check` | Test DB connection only (no migrations). |

So for a **fresh DB with TypeScript only**: start Postgres, then run `npm run db:migrate`. The repo already includes an initial migration in `./drizzle/`. If the database was created by Python (Alembic), you can skip `db:migrate` and use the existing schema; the TS app works against the same tables.

**Option B – Standalone image**

```bash
docker build -f Dockerfile.ts -t salesagent-ts .
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://user:pass@host:5432/dbname" \
  salesagent-ts
```

Replace `DATABASE_URL` with your PostgreSQL connection string. The app will listen on port 3000 inside the container.

## Running TS-only

- **Start:** `npm start` (or `tsx src/run.ts`) – single process serves:
  - `GET /`, `GET /landing` – landing page
  - `GET /health` – health check
  - `POST|GET /mcp` – MCP (Streamable HTTP)
  - `POST /a2a` – A2A (JSON-RPC)
  - `GET /admin`, `GET /admin/api/*` – Admin UI and API

- **Database:** Same PostgreSQL schema as Python (Alembic). Use existing migrations; TS uses Drizzle for read/write against the same DB.

- **Docker/nginx:** Point nginx to the TS app (e.g. one Node process on PORT). Python can be retired from production; keep `python_src` in the repo for reference or remove after cutover.

## Multi-stage Docker build

The `Dockerfile.ts` uses a multi-stage build:

1. **frontend-build** stage — installs frontend dependencies and runs `npm run build` to produce the React SPA.
2. **app** stage — installs backend dependencies, copies source and migrations, then copies the built frontend from stage 1 into `dist/frontend`.

A single `docker compose up --build postgres ts-app` builds everything (frontend + backend) and starts Postgres, runs migrations, and launches the app. The admin UI is served at `/admin` from the built React SPA — no separate build step is needed.

**Metrics:** `GET /metrics` returns Prometheus-format metrics.

**Sessions:** The app uses `express-session` with an in-memory store by default. For production, switch to `connect-pg-simple` (or another persistent store) so sessions survive restarts.

## Remaining optional ports (Phase 5)

- **Services:** GAM inventory sync, setup checklist, policy, Slack, activity feed, AI agents, delivery webhooks – can be ported incrementally; stubs/interfaces exist where needed.
- **Adapters:** Kevel, Triton, Broadstreet – register in `src/adapters/registryBootstrap.ts` when ported; adapter registry and `getAdapter()` already support them.
- **Metrics:** Replace `prometheus-client` with a Node metrics library (e.g. `prom-client`) when required.

## Configuration

- Same env as Python: `DATABASE_URL`, `GEMINI_API_KEY`, `ADCP_DRY_RUN`, `SALES_AGENT_DOMAIN`, `GAM_OAUTH_CLIENT_ID`, `GAM_OAUTH_CLIENT_SECRET`, etc.
- Auth: Tenant from Host / subdomain / `x-adcp-tenant`; principal from `x-adcp-auth` or `Authorization: Bearer`.

---
name: Full TS feature parity plan
overview: "Bring the TypeScript codebase to full feature parity with Python while fixing code smells. Covers: code quality refactors, 20+ missing DB tables, full React SPA admin UI, OAuth/OIDC, all 4 adapters (GAM complete, Kevel, Triton, Broadstreet), AI agents, webhooks, background jobs, Slack, metrics, structured logging, security hardening, and comprehensive tests."
todos:
  - id: p0-refactor
    content: "Phase 0: Code quality refactors (auth middleware, shared utils, error hierarchy, Express unification)"
    status: completed
  - id: p1-db
    content: "Phase 1: Add 20+ missing DB tables, repositories, expand TenantConfig"
    status: completed
  - id: p2-auth
    content: "Phase 2: OAuth/OIDC, sessions, security hardening (SSRF, HMAC, CSRF, rate limit, Helmet)"
    status: completed
  - id: p3-adapters
    content: "Phase 3: Complete GAM + port Kevel, Triton, Broadstreet adapters"
    status: completed
  - id: p4-services
    content: "Phase 4: Port 28 missing services (webhooks, Slack, policy, inventory, pricing, etc.)"
    status: completed
  - id: p5-ai
    content: "Phase 5: AI agents (review, naming, policy, ranking) with multi-provider support"
    status: completed
  - id: p6-jobs
    content: "Phase 6: Background job queue (webhook scheduler, status poller, approval, sync workers)"
    status: completed
  - id: p7-admin
    content: "Phase 7: React SPA admin UI + expand admin API to ~200 routes"
    status: completed
  - id: p8-observability
    content: "Phase 8: Prometheus metrics, structured logging (pino), expanded health checks"
    status: completed
  - id: p9-tools-tests
    content: "Phase 9: Complete tool stubs + comprehensive test suite (unit, integration, e2e)"
    status: completed
  - id: p10-docker
    content: "Phase 10: Multi-stage Docker build, updated compose, nginx, deployment docs"
    status: completed
isProject: false
---

# Full TypeScript Feature Parity Plan

## Phase 0 — Code Quality Refactors (fix before adding features)

These address the code smells found in the current TS codebase. Doing them first prevents the problems from multiplying as we add features.

### 0.1 Extract MCP/A2A auth middleware

The auth/tenant resolution block is duplicated **13 times** in [src/mcp/server.ts](src/mcp/server.ts) and once globally in [src/a2a/server.ts](src/a2a/server.ts). Extract a `createToolHandler(fn)` higher-order function that wraps auth resolution, tenant check, and error formatting. Each tool registration becomes a one-liner.

For A2A, replace the 13-case switch with a `Map<string, ToolFn>` dispatch table.

### 0.2 Extract shared utilities

- `headersFromRequest()` is duplicated in [src/a2a/server.ts](src/a2a/server.ts) and [src/admin/api.ts](src/admin/api.ts). Move to [src/core/httpHeaders.ts](src/core/httpHeaders.ts).
- `ensurePrincipal(ctx)` helper — the `ctx.principal ? toPrincipal(...) : { ... anonymous ... }` pattern is repeated **4 times** in [src/services/MediaBuyService.ts](src/services/MediaBuyService.ts). Extract once.
- Move hardcoded magic strings (`"draft"`, `"USD"`, `"unknown"`, `"all_inventory"`) to [src/core/constants.ts](src/core/constants.ts).

### 0.3 Move business logic out of tools

[src/tools/products.ts](src/tools/products.ts) contains DB queries, pricing filtering, and adapter calls. Extract to a `ProductService` in `src/services/`. Tools should only map request/response.

### 0.4 Unify HTTP server on Express

[src/run.ts](src/run.ts) mixes raw `http.createServer` with Express for admin. Move everything to Express: mount MCP at `/mcp`, A2A at `/a2a`, admin at `/admin`, health and landing as Express routes. Add global error-handling middleware and request logging.

### 0.5 Domain error hierarchy

Replace generic `Error` throws with typed domain errors: `ValidationError`, `NotFoundError`, `AuthError`, `AdapterError`. Add a single error-to-response mapper for MCP (text content), A2A (JSON-RPC error), and HTTP (JSON status).

---

## Phase 1 — Database Completeness (20+ missing tables)

Add the ~20 missing tables to [src/db/schema.ts](src/db/schema.ts) and create repositories:

- `currency_limits`, `users`, `tenant_auth_configs`
- `creative_reviews`, `creative_assignments`, `creative_agents`, `signals_agents`
- `gam_inventory`, `inventory_profiles`, `product_inventory_mappings`, `format_performance_metrics`
- `gam_orders`, `gam_line_items`, `sync_jobs`
- `strategies`, `strategy_states`
- `authorized_properties`, `property_tags`, `publisher_partners`
- `push_notification_configs`, `webhook_deliveries`, `webhook_delivery_log`

After adding tables: `npm run db:generate` to create the migration, update repositories in `src/db/repositories/`.

Extend [src/core/config/types.ts](src/core/config/types.ts) `TenantConfig` to include all ~40 tenant fields (AI policy, advertising policy, thresholds, naming templates, measurement providers, favicon, billing, etc.).

---

## Phase 2 — Auth and Security

### 2.1 OAuth / OIDC

Add `src/core/auth/oauth.ts`:

- Google OAuth flow (authorize URL, callback, token exchange, userinfo)
- Generic OIDC discovery (Okta, Auth0, Azure AD, Keycloak) per tenant via `tenant_auth_configs`
- Session management (express-session + connect-pg-simple for PostgreSQL-backed sessions)
- GAM OAuth flow (for adapter auth, separate from user login)
- Test mode login (password `test123`, gated by `ADCP_AUTH_TEST_MODE`)

### 2.2 Security hardening

- **SSRF protection**: Validate webhook URLs (block private IPs, localhost)
- **HMAC-SHA256 webhook signing**: Port from Python `webhook_authenticator.py`
- **Encrypted secrets**: Helper to encrypt/decrypt API keys in DB (Gemini, GAM service account)
- **CSRF tokens**: For admin form submissions
- **Rate limiting**: `express-rate-limit` on auth and API routes
- **Helmet**: HTTP security headers

---

## Phase 3 — Adapters (GAM complete + Kevel + Triton + Broadstreet)

### 3.1 GAM — complete the adapter

Current GAM in [src/adapters/gam/](src/adapters/gam/) only does orders + line items. Port the missing managers from Python `python_src/src/adapters/gam/managers/`:

- `inventory.ts` — Inventory sync, tree, targeting keys
- `reporting.ts` — Delivery reporting API
- `sync.ts` — Background sync operations
- `targeting.ts` — Custom targeting management
- `creatives.ts` — Creative association and management
- `workflow.ts` — Approval workflow
- `gam/utils/` — Error handler, formatters, health check, macros, naming, timeout handler, validation

Plus: `gam_data_freshness.ts`, `gam_inventory_discovery.ts`, `gam_orders_discovery.ts`, `gam_reporting_service.ts`.

### 3.2 Kevel adapter

New `src/adapters/kevel/` — port from `python_src/src/adapters/kevel.py`. Register in [src/adapters/registryBootstrap.ts](src/adapters/registryBootstrap.ts).

### 3.3 Triton Digital adapter

New `src/adapters/triton/` — port from `python_src/src/adapters/triton_digital.py`. Register in bootstrap.

### 3.4 Broadstreet adapter

New `src/adapters/broadstreet/` — port from `python_src/src/adapters/broadstreet/` (campaigns, advertisements, inventory, placements, workflow managers). Register in bootstrap.

---

## Phase 4 — Services (28 missing)

Port services to `src/services/`, grouped by domain:

**Core services:**

- `PolicyService` — Policy management + compliance checking
- `SetupChecklistService` — Tenant setup progress tracking
- `ActivityFeedService` — Activity stream (SSE or polling)
- `AuditLogService` — Structured audit logging with DB persistence

**Webhook services:**

- `WebhookDeliveryService` — Delivery with exponential backoff retry
- `WebhookVerificationService` — HMAC-SHA256 verification
- `WebhookValidatorService` — SSRF protection (URL validation)
- `ProtocolWebhookService` — MCP/A2A push notifications

**Notification services:**

- `SlackNotifier` — Real Slack webhook implementation (replace no-op)

**GAM services:**

- `GamInventoryService` — Inventory sync with progress
- `GamOrdersService` — Orders management
- `GamProductConfigService` — Product configuration
- `GcpServiceAccountService` — Service account provisioning

**Pricing and products:**

- `DynamicPricingService` — Dynamic pricing calculations
- `DynamicProductsService` — Dynamic product generation
- `DefaultProductsService` — Default product catalog
- `FormatMetricsService` — Format performance metrics

**Auth services:**

- `AuthConfigService` — Tenant auth configuration management

**Property services:**

- `PropertyDiscoveryService` — Discovery from ad servers
- `PropertyVerificationService` — Domain verification

**Delivery and status:**

- `DeliverySimulatorService` — Campaign delivery simulation (mock)
- `OrderApprovalService` — Approval workflow processing

**Strategy:**

- `StrategyService` — Strategy management and simulation

**Targeting:**

- `TargetingCapabilitiesService` — Targeting discovery
- `TargetingDimensionsService` — Targeting dimensions

---

## Phase 5 — AI Agents

New `src/services/ai/`:

- `config.ts` — Multi-provider config (Gemini, OpenAI, Anthropic)
- `factory.ts` — Agent factory (provider-agnostic)
- `agents/reviewAgent.ts` — Creative review with confidence scoring
- `agents/namingAgent.ts` — Order/line item name generation
- `agents/policyAgent.ts` — Policy compliance checking
- `agents/rankingAgent.ts` — Product ranking by brief relevance

Use a lightweight LLM client library (e.g. `ai` from Vercel AI SDK or direct HTTP calls to provider APIs). Wire the ranking agent into `ProductService.getProducts()` (when tenant has `product_ranking_prompt` set).

---

## Phase 6 — Background Jobs

Add a job queue using **BullMQ + Redis** (or **pg-boss** for Postgres-only):

- `DeliveryWebhookScheduler` — Periodic webhook delivery
- `MediaBuyStatusScheduler` — Media buy status polling
- `BackgroundApprovalWorker` — Async approval processing
- `BackgroundSyncWorker` — GAM inventory/order sync

New `src/jobs/` directory with a `worker.ts` entry point. Run as a separate process or in-process with the app. Add Redis (or use pg-boss for zero-dep) to `docker-compose.yml`.

---

## Phase 7 — Admin React SPA

### 7.1 Project setup

New `frontend/` directory:

- Vite + React + TypeScript
- Tailwind CSS (modern replacement for Bootstrap)
- React Router for client-side routing
- `fetch` wrapper with auth headers and error handling

Build output served by Express at `/admin` (static files). API calls go to `/admin/api/*`.

### 7.2 Admin API expansion

Expand [src/admin/api.ts](src/admin/api.ts) to cover all CRUD operations (matching the ~200 Python routes):

- Auth routes: `/admin/api/auth/login`, `/admin/api/auth/callback`, `/admin/api/auth/logout`, `/admin/api/auth/session`
- Tenants: CRUD + dashboard data + settings + deactivate/reactivate
- Products: CRUD + inventory mapping
- Principals: CRUD + platform mappings + webhooks
- Users: CRUD + roles + domain allowlists + setup mode
- Media buys: List + detail + approve + delivery webhook trigger
- Creatives: List + review + approve/reject + AI review
- Creative agents: CRUD + test
- Signals agents: CRUD + test
- Inventory: Sync, tree, targeting, sizes, profiles CRUD
- Orders: List + detail + sync from GAM
- Properties: CRUD + upload + verify + sync
- Property tags: CRUD
- Publisher partners: CRUD + sync
- Workflows: List + review + approve/reject
- Webhooks: Management (register, delete, toggle)
- Policy: Settings + rules + review
- Settings: General, adapter, Slack, AI, domains, emails, business rules, Approximated domain
- GAM: Detect network, configure, service accounts, custom targeting keys, connection test
- OIDC: Configure, enable, disable, test
- Operations: Reporting dashboard
- Signup: Onboarding flow
- Format search: Search, list, templates, agents

Organize into Express routers per domain (e.g. `src/admin/routes/products.ts`, `src/admin/routes/tenants.ts`).

### 7.3 React pages

Minimum viable pages (matching Python templates):

- **Login** — OAuth buttons, test mode form, tenant selector
- **Dashboard** — Metric cards, activity feed, revenue chart (Chart.js or Recharts)
- **Products** — List with card/table toggle, add/edit/delete forms
- **Principals** — List, create, edit, platform mappings, webhook config
- **Users** — List, add, role management, domain allowlists
- **Media Buys** — List, detail with packages, approval actions
- **Creatives** — List, review panel, AI review trigger, approve/reject
- **Settings** — Tabs: general, adapter, Slack, AI, domains, business rules
- **Inventory** — Tree browser, targeting explorer, sync status
- **Workflows** — Approval queue, review detail, approve/reject actions
- **Properties** — List, create/edit, verification status
- **GAM Config** — Network detection, connection test, service accounts

---

## Phase 8 — Observability

### 8.1 Metrics

Add `prom-client` for Prometheus metrics:

- AI review metrics (total, duration, errors, confidence)
- Webhook delivery metrics (total, duration, attempts)
- Tool call metrics (per tool, duration, errors)
- HTTP request metrics (method, path, status, duration)
- Active connection gauges

Expose at `GET /metrics`.

### 8.2 Structured logging

Replace `console.log` with `pino` (or `winston`):

- JSON output in production
- Request ID propagation
- Per-module log levels
- Client disconnect filtering
- Audit logger (DB-backed trail with file backup)

### 8.3 Health checks

Expand `/health` to include: DB connectivity, adapter status, job queue status.

---

## Phase 9 — Tool Completeness and Tests

### 9.1 Complete tool implementations

- `list_authorized_properties` — Query `authorized_properties`, `property_tags`, `publisher_partners` from DB (currently returns hardcoded stub)
- `list_creative_formats` — Query `creative_agents` and resolve from agent URLs (currently returns hardcoded stub)
- `sync_creatives` — Call adapter and persist (currently returns `{ synced: 0 }`)
- `get_products` — Add policy checks, AI ranking (Phase 5), dynamic pricing, brand manifest
- `create_media_buy` — Add validation, setup checks, policy, notifications, approval workflow, audit log
- `get_adcp_capabilities` — Query publisher_partners for portfolio, use full adapter capabilities
- Add `signals` tools (`get_signals`, `activate_signal`)

### 9.2 Comprehensive tests

- **Unit tests**: All services, repositories, auth, config, adapter registry, domain errors
- **Integration tests**: Tool flows end-to-end against test DB (use Testcontainers for Postgres)
- **MCP/A2A protocol tests**: Tool registration, request/response format, error codes
- **Admin API tests**: All routes, auth, CRUD operations
- **React component tests**: Vitest + React Testing Library
- **E2E tests**: Playwright for admin UI flows

Target: match Python test coverage (hundreds of tests across unit/integration/e2e).

---

## Phase 10 — Docker and Deployment

- Update [Dockerfile.ts](Dockerfile.ts): multi-stage build (build frontend, then copy into Node image)
- Update [docker-compose.yml](docker-compose.yml): add Redis (if using BullMQ), job worker service, frontend build step
- Nginx config: proxy all traffic to single TS process (`/mcp`, `/a2a`, `/admin`, `/health`)
- Remove Python services from compose (or mark as legacy)
- Update [docs/deployment-proxmox.md](docs/deployment-proxmox.md) and [docs/ts-migration.md](docs/ts-migration.md)

---

## Execution Order


| Phase | Effort | Depends On     | Delivers                            |
| ----- | ------ | -------------- | ----------------------------------- |
| 0     | Small  | Nothing        | Clean foundation for all later work |
| 1     | Medium | Phase 0        | All DB tables + repos               |
| 2     | Medium | Phase 1        | OAuth login, sessions, security     |
| 3     | Large  | Phase 1        | All 4 adapters fully ported         |
| 4     | Large  | Phases 1, 3    | All services                        |
| 5     | Medium | Phases 1, 4    | AI agents                           |
| 6     | Medium | Phases 1, 4    | Background jobs                     |
| 7     | Large  | Phases 2, 4    | Full React admin UI + expanded API  |
| 8     | Small  | Phase 4        | Metrics, logging, health            |
| 9     | Medium | Phases 4, 5, 7 | Complete tools + full test suite    |
| 10    | Small  | Phase 7        | Production-ready Docker             |



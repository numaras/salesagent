/**
 * Unified Express HTTP server: MCP, A2A, Admin, health, landing.
 * All routes on a single Express app; no raw http.createServer.
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";
import express from "express";
import { createServer } from "node:http";
import session from "express-session";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { registerAdapters } from "./adapters/registryBootstrap.js";
import { handleA2aRequest } from "./a2a/server.js";
import { createMcpServer } from "./mcp/server.js";
import { createAdminRouter } from "./admin/index.js";
import { toHttpError } from "./core/errors.js";
import { registry } from "./core/metrics.js";
import { startJobs } from "./jobs/index.js";
import { getPool } from "./db/client.js";
import { isAdminIpAllowed } from "./core/security/ipAllowlist.js";

registerAdapters();

const app = express();
const mcp = createMcpServer();
const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === "production";
const require = createRequire(import.meta.url);
// connect-pg-simple ships without bundled TS types in this setup.
const connectPgSimple = require("connect-pg-simple") as (s: typeof session) => {
  new(options: { pool: unknown; tableName: string; createTableIfMissing: boolean }): session.Store;
};
const PgStore = connectPgSimple(session);

app.set("trust proxy", process.env.TRUST_PROXY ?? "loopback");
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        frameAncestors: ["'none'"],
        objectSrc: ["'none'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https:"],
        fontSrc: ["'self'", "data:"],
        formAction: ["'self'"],
        upgradeInsecureRequests: isProd ? [] : null,
      },
    },
  })
);

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });
const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 8,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/admin/api/auth/test-login", authLimiter, loginLimiter);
app.use("/admin/api/auth/google", authLimiter);
app.use("/admin/api/auth/google/callback", authLimiter, loginLimiter);
app.use("/admin/api/auth/mfa/verify", authLimiter, loginLimiter);

app.use(
  session({
    name: isProd ? "__Host-salesagent.sid" : "salesagent.sid",
    secret: process.env.SESSION_SECRET || "dev-session-secret-change-me",
    store: new PgStore({
      pool: getPool(),
      tableName: "user_sessions",
      createTableIfMissing: true,
    }),
    proxy: isProd,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      secure: isProd,
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: "lax",
    },
  })
);

app.get("/health", (_req, res) => {
  res.json({ status: "healthy", service: "ts-app", uptime: process.uptime() });
});
app.get("/metrics", async (_req, res) => {
  res.set("Content-Type", registry.contentType);
  res.end(await registry.metrics());
});
app.get(["/", "/landing"], (_req, res) => {
  res.type("html").send(
    "<!DOCTYPE html><html><head><title>Prebid Sales Agent</title></head><body>" +
    "<h1>Prebid Sales Agent</h1><p>MCP: /mcp | A2A: /a2a | Admin: /admin</p></body></html>"
  );
});

app.all("/mcp", async (req, res) => { await mcp.handleRequest(req, res); });
app.post("/a2a", async (req, res) => { await handleA2aRequest(req, res); });

app.use(express.json());

app.use("/admin", (req, res, next) => {
  if (isAdminIpAllowed(req.ip ?? "")) {
    next();
    return;
  }
  res.status(403).json({ error: "FORBIDDEN_IP", message: "Admin access is not allowed from this IP." });
});

app.use("/admin", createAdminRouter());

const frontendDir = join(process.cwd(), "dist", "frontend");
if (existsSync(frontendDir)) {
  app.use("/admin", express.static(frontendDir));
  app.get("/admin/{*splat}", (_req, res) => { res.sendFile(join(frontendDir, "index.html")); });
} else {
  app.get("/admin", (_req, res) => {
    res.type("html").send(
      "<html><body><h1>Admin</h1><p>Run <code>cd frontend && npm run build</code> for the full React UI.</p>" +
      "<p><a href='/admin/api/health'>API Health</a></p></body></html>"
    );
  });
}

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const { status, body } = toHttpError(err);
  res.status(status).json(body);
});

if (process.env.NODE_ENV === "production" && !process.env.SESSION_SECRET) {
  console.error("FATAL: SESSION_SECRET environment variable must be set in production.");
  process.exit(1);
}
if (process.env.NODE_ENV === "production" && !process.env.ENCRYPTION_KEY) {
  console.error("FATAL: ENCRYPTION_KEY environment variable must be set in production.");
  process.exit(1);
}

const server = createServer(app);
server.listen(PORT, "0.0.0.0", () => {
  console.log(`TS app listening on http://0.0.0.0:${PORT}`);
  startJobs();
});

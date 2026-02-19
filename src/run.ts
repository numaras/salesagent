/**
 * Unified Express HTTP server: MCP, A2A, Admin, health, landing.
 * All routes on a single Express app; no raw http.createServer.
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
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

registerAdapters();

const app = express();
const mcp = createMcpServer();
const PORT = Number(process.env.PORT) || 3000;

app.use(helmet({ contentSecurityPolicy: false }));

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use("/admin/api/auth", authLimiter);

app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev-session-secret-change-me",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
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

const server = createServer(app);
server.listen(PORT, "0.0.0.0", () => {
  console.log(`TS app listening on http://0.0.0.0:${PORT}`);
  startJobs();
});

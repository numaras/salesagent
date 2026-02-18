/**
 * HTTP server: health, MCP at /mcp, A2A at /a2a, Admin at /admin.
 * Listens on PORT (default 3000).
 */

import { createServer } from "node:http";
import express from "express";
import { registerAdapters } from "./adapters/registryBootstrap.js";
import { handleA2aRequest } from "./a2a/server.js";
import { createMcpServer } from "./mcp/server.js";
import { createAdminRouter, adminIndexHandler } from "./admin/index.js";

registerAdapters();

const mcp = createMcpServer();
const PORT = Number(process.env.PORT) || 3000;

const adminApp = express();
adminApp.use(express.json());
adminApp.get("/admin", adminIndexHandler);
adminApp.use("/admin", createAdminRouter());

const server = createServer(async (req, res) => {
  const path = req.url?.split("?")[0];
  if (path === "/health") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("ok\n");
    return;
  }
  if (path === "/" || path === "/landing") {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(
      "<!DOCTYPE html><html><head><title>Prebid Sales Agent</title></head><body><h1>Prebid Sales Agent</h1><p>MCP: /mcp | A2A: /a2a | Admin: /admin</p></body></html>"
    );
    return;
  }
  if (path === "/mcp" && (req.method === "POST" || req.method === "GET")) {
    await mcp.handleRequest(req, res);
    return;
  }
  if (path === "/a2a") {
    await handleA2aRequest(req, res);
    return;
  }
  if (path?.startsWith("/admin")) {
    adminApp(req, res);
    return;
  }
  res.writeHead(404);
  res.end();
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`TS app listening on http://0.0.0.0:${PORT}`);
});

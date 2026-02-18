/**
 * Admin UI placeholder and API mount.
 * Serves a minimal admin page and /admin/api/* routes.
 */

import { type Request, type Response } from "express";
import { createAdminRouter } from "./api.js";

export { createAdminRouter };

export function adminIndexHandler(_req: Request, res: Response): void {
  res.setHeader("Content-Type", "text/html");
  res.end(`
<!DOCTYPE html>
<html>
<head><title>Admin</title></head>
<body>
  <h1>Prebid Sales Agent – Admin</h1>
  <p>Admin UI (TypeScript). Use the same auth headers as MCP/A2A.</p>
  <ul>
    <li><a href="/admin/api/health">API Health</a></li>
    <li><a href="/admin/api/products">API Products</a> (requires tenant auth)</li>
  </ul>
</body>
</html>
  `);
}

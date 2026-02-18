/**
 * Admin API: REST routes for tenants, products, etc.
 * Same auth as MCP/A2A (tenant + principal from headers).
 */

import { type Request, type Response, Router } from "express";
import { resolveFromHeaders, toToolContext } from "../core/auth/authService.js";
import { getDb } from "../db/client.js";
import { listProductsByTenant } from "../db/repositories/product.js";
import { getTenantById } from "../db/repositories/tenant.js";

function headersFromRequest(req: Request): Record<string, string> {
  const out: Record<string, string> = {};
  const h = req.headers;
  if (!h) return out;
  for (const [k, v] of Object.entries(h)) {
    if (typeof v === "string") out[k] = v;
    else if (Array.isArray(v) && v[0]) out[k] = v[0];
  }
  return out;
}

export function createAdminRouter(): Router {
  const router = Router();

  router.get("/api/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", service: "admin-api" });
  });

  router.get("/api/tenants/:tenantId", async (req: Request, res: Response) => {
    const db = getDb();
    const tenantId = typeof req.params.tenantId === "string" ? req.params.tenantId : req.params.tenantId?.[0];
    if (!tenantId) {
      res.status(400).json({ error: "tenantId required" });
      return;
    }
    const row = await getTenantById(db, tenantId);
    if (!row) {
      res.status(404).json({ error: "Tenant not found" });
      return;
    }
    res.json({
      tenant_id: row.tenantId,
      name: row.name,
      subdomain: row.subdomain,
      is_active: row.isActive,
    });
  });

  router.get("/api/products", async (req: Request, res: Response) => {
    const headers = headersFromRequest(req);
    const result = await resolveFromHeaders(headers);
    const ctx = toToolContext(result);
    if (!ctx?.tenantId) {
      res.status(401).json({ error: "TENANT_ERROR", message: "Could not resolve tenant" });
      return;
    }
    const db = getDb();
    const rows = await listProductsByTenant(db, ctx.tenantId);
    res.json({
      products: rows.map((r) => ({
        product_id: r.productId,
        name: r.name,
        description: r.description,
        delivery_type: r.deliveryType,
      })),
    });
  });

  return router;
}

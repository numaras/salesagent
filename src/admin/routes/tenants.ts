import { type Request, type Response, Router } from "express";
import { eq } from "drizzle-orm";
import { NotFoundError, toHttpError, ValidationError } from "../../core/errors.js";
import { getDb } from "../../db/client.js";
import { getTenantById } from "../../db/repositories/tenant.js";
import { listProductsByTenant } from "../../db/repositories/product.js";
import { listMediaBuysByTenant } from "../../db/repositories/media-buy.js";
import { listAuditLogsByTenant } from "../../db/repositories/audit-log.js";
import { getChecklist } from "../../services/SetupChecklistService.js";
import { tenants, principals } from "../../db/schema.js";

function paramStr(v: string | string[] | undefined): string | undefined {
  return typeof v === "string" ? v : v?.[0];
}

export function createTenantsRouter(): Router {
  const router = Router();

  router.get("/tenants", async (_req: Request, res: Response) => {
    try {
      const db = getDb();
      const rows = await db.select().from(tenants);
      res.json({
        tenants: rows.map((r) => ({
          tenant_id: r.tenantId,
          name: r.name,
          subdomain: r.subdomain,
          is_active: r.isActive,
          created_at: r.createdAt,
        })),
      });
    } catch (err) {
      const { status, body } = toHttpError(err);
      res.status(status).json(body);
    }
  });

  router.get("/tenants/:tenantId", async (req: Request, res: Response) => {
    try {
      const db = getDb();
      const tenantId = paramStr(req.params.tenantId);
      if (!tenantId) throw new NotFoundError("Tenant", "undefined");
      const row = await getTenantById(db, tenantId);
      if (!row) throw new NotFoundError("Tenant", tenantId);
      res.json({
        tenant_id: row.tenantId,
        name: row.name,
        subdomain: row.subdomain,
        is_active: row.isActive,
        ad_server: row.adServer,
        created_at: row.createdAt,
        updated_at: row.updatedAt,
      });
    } catch (err) {
      const { status, body } = toHttpError(err);
      res.status(status).json(body);
    }
  });

  router.get("/tenants/:tenantId/dashboard", async (req: Request, res: Response) => {
    try {
      const db = getDb();
      const tenantId = paramStr(req.params.tenantId);
      if (!tenantId) throw new NotFoundError("Tenant", "undefined");

      const tenant = await getTenantById(db, tenantId);
      if (!tenant) throw new NotFoundError("Tenant", tenantId);

      const [productRows, principalRows, mediaBuyRows, recentActivity] =
        await Promise.all([
          listProductsByTenant(db, tenantId),
          db.select().from(principals).where(eq(principals.tenantId, tenantId)),
          listMediaBuysByTenant(db, tenantId),
          listAuditLogsByTenant(db, tenantId, 10),
        ]);

      res.json({
        tenant_id: tenantId,
        product_count: productRows.length,
        principal_count: principalRows.length,
        media_buy_count: mediaBuyRows.length,
        recent_activity: recentActivity.map((a) => ({
          log_id: a.logId,
          operation: a.operation,
          timestamp: a.timestamp,
          success: a.success,
          principal_name: a.principalName,
        })),
      });
    } catch (err) {
      const { status, body } = toHttpError(err);
      res.status(status).json(body);
    }
  });

  router.get("/tenants/:tenantId/setup-checklist", async (req: Request, res: Response) => {
    try {
      const tenantId = paramStr(req.params.tenantId);
      if (!tenantId) throw new NotFoundError("Tenant", "undefined");
      const checklist = await getChecklist(tenantId);
      res.json(checklist);
    } catch (err) {
      const { status, body } = toHttpError(err);
      res.status(status).json(body);
    }
  });

  router.post("/tenants/:tenantId/settings", async (req: Request, res: Response) => {
    try {
      const db = getDb();
      const tenantId = paramStr(req.params.tenantId);
      if (!tenantId) throw new NotFoundError("Tenant", "undefined");

      const existing = await getTenantById(db, tenantId);
      if (!existing) throw new NotFoundError("Tenant", tenantId);

      const { name } = req.body as { name?: string };
      if (!name || typeof name !== "string") {
        throw new ValidationError("name is required");
      }

      const updated = await db
        .update(tenants)
        .set({ name, updatedAt: new Date() })
        .where(eq(tenants.tenantId, tenantId))
        .returning();

      const row = updated[0]!;
      res.json({ tenant_id: row.tenantId, name: row.name, updated_at: row.updatedAt });
    } catch (err) {
      const { status, body } = toHttpError(err);
      res.status(status).json(body);
    }
  });

  return router;
}

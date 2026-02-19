import { type Request, type Response, Router } from "express";
import { eq } from "drizzle-orm";
import { resolveFromHeaders, toToolContext } from "../../core/auth/authService.js";
import { NotFoundError, TenantError, toHttpError, ValidationError } from "../../core/errors.js";
import { headersFromNodeRequest } from "../../core/httpHeaders.js";
import { getDb } from "../../db/client.js";
import { getTenantById } from "../../db/repositories/tenant.js";
import { tenants } from "../../db/schema.js";

export function createPolicyRouter(): Router {
  const router = Router();

  router.get("/policy", async (req: Request, res: Response) => {
    try {
      const headers = headersFromNodeRequest(req);
      const result = await resolveFromHeaders(headers);
      const ctx = toToolContext(result);
      if (!ctx?.tenantId) throw new TenantError();
      const db = getDb();

      const tenant = await getTenantById(db, ctx.tenantId);
      if (!tenant) throw new NotFoundError("Tenant", ctx.tenantId);

      res.json({
        tenant_id: tenant.tenantId,
        brand_manifest_policy: tenant.brandManifestPolicy,
        ad_server: tenant.adServer,
      });
    } catch (err) {
      const { status, body } = toHttpError(err);
      res.status(status).json(body);
    }
  });

  router.post("/policy", async (req: Request, res: Response) => {
    try {
      const headers = headersFromNodeRequest(req);
      const result = await resolveFromHeaders(headers);
      const ctx = toToolContext(result);
      if (!ctx?.tenantId) throw new TenantError();
      const db = getDb();

      const tenant = await getTenantById(db, ctx.tenantId);
      if (!tenant) throw new NotFoundError("Tenant", ctx.tenantId);

      const body = req.body as Record<string, unknown>;
      if (!body.brand_manifest_policy || typeof body.brand_manifest_policy !== "string") {
        throw new ValidationError("brand_manifest_policy is required");
      }

      const updated = await db
        .update(tenants)
        .set({
          brandManifestPolicy: body.brand_manifest_policy,
          updatedAt: new Date(),
        })
        .where(eq(tenants.tenantId, ctx.tenantId))
        .returning();

      const row = updated[0]!;
      res.json({
        tenant_id: row.tenantId,
        brand_manifest_policy: row.brandManifestPolicy,
        updated_at: row.updatedAt,
      });
    } catch (err) {
      const { status, body } = toHttpError(err);
      res.status(status).json(body);
    }
  });

  return router;
}

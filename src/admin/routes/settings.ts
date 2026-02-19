import { type Request, type Response, Router } from "express";
import { eq } from "drizzle-orm";
import { resolveFromHeaders, toToolContext } from "../../core/auth/authService.js";
import { NotFoundError, TenantError, toHttpError, ValidationError } from "../../core/errors.js";
import { headersFromNodeRequest } from "../../core/httpHeaders.js";
import { getDb } from "../../db/client.js";
import { getTenantById } from "../../db/repositories/tenant.js";
import { getAdapterConfigByTenant } from "../../db/repositories/adapter-config.js";
import { tenants, adapterConfig } from "../../db/schema.js";

export function createSettingsRouter(): Router {
  const router = Router();

  router.get("/settings", async (req: Request, res: Response) => {
    try {
      const headers = headersFromNodeRequest(req);
      const result = await resolveFromHeaders(headers);
      const ctx = toToolContext(result);
      if (!ctx?.tenantId) throw new TenantError();
      const db = getDb();

      const tenant = await getTenantById(db, ctx.tenantId);
      if (!tenant) throw new NotFoundError("Tenant", ctx.tenantId);
      const adapter = await getAdapterConfigByTenant(db, ctx.tenantId);

      res.json({
        general: {
          tenant_id: tenant.tenantId,
          name: tenant.name,
          subdomain: tenant.subdomain,
          ad_server: tenant.adServer,
          brand_manifest_policy: tenant.brandManifestPolicy,
          auth_setup_mode: tenant.authSetupMode,
        },
        adapter: adapter
          ? {
              adapter_type: adapter.adapterType,
              mock_dry_run: adapter.mockDryRun,
              gam_network_code: adapter.gamNetworkCode,
              config_json: adapter.configJson,
            }
          : null,
      });
    } catch (err) {
      const { status, body } = toHttpError(err);
      res.status(status).json(body);
    }
  });

  router.post("/settings/general", async (req: Request, res: Response) => {
    try {
      const headers = headersFromNodeRequest(req);
      const result = await resolveFromHeaders(headers);
      const ctx = toToolContext(result);
      if (!ctx?.tenantId) throw new TenantError();
      const db = getDb();

      const existing = await getTenantById(db, ctx.tenantId);
      if (!existing) throw new NotFoundError("Tenant", ctx.tenantId);

      const body = req.body as Record<string, unknown>;
      if (!body.name || typeof body.name !== "string") {
        throw new ValidationError("name is required");
      }

      const updated = await db
        .update(tenants)
        .set({
          name: body.name,
          brandManifestPolicy: (body.brand_manifest_policy as string) ?? existing.brandManifestPolicy,
          updatedAt: new Date(),
        })
        .where(eq(tenants.tenantId, ctx.tenantId))
        .returning();

      const row = updated[0]!;
      res.json({
        tenant_id: row.tenantId,
        name: row.name,
        brand_manifest_policy: row.brandManifestPolicy,
        updated_at: row.updatedAt,
      });
    } catch (err) {
      const { status, body } = toHttpError(err);
      res.status(status).json(body);
    }
  });

  router.post("/settings/adapter", async (req: Request, res: Response) => {
    try {
      const headers = headersFromNodeRequest(req);
      const result = await resolveFromHeaders(headers);
      const ctx = toToolContext(result);
      if (!ctx?.tenantId) throw new TenantError();
      const db = getDb();

      const body = req.body as Record<string, unknown>;
      if (!body.adapter_type || typeof body.adapter_type !== "string") {
        throw new ValidationError("adapter_type is required");
      }

      const existing = await getAdapterConfigByTenant(db, ctx.tenantId);
      if (existing) {
        const updated = await db
          .update(adapterConfig)
          .set({
            adapterType: body.adapter_type,
            configJson: (body.config_json as Record<string, unknown>) ?? existing.configJson,
            gamNetworkCode: (body.gam_network_code as string) ?? existing.gamNetworkCode,
            mockDryRun: (body.mock_dry_run as boolean) ?? existing.mockDryRun,
            updatedAt: new Date(),
          })
          .where(eq(adapterConfig.tenantId, ctx.tenantId))
          .returning();
        const row = updated[0]!;
        res.json({ adapter_type: row.adapterType, updated_at: row.updatedAt });
      } else {
        const inserted = await db
          .insert(adapterConfig)
          .values({
            tenantId: ctx.tenantId,
            adapterType: body.adapter_type,
            configJson: (body.config_json as Record<string, unknown>) ?? {},
            gamNetworkCode: (body.gam_network_code as string) ?? null,
            mockDryRun: (body.mock_dry_run as boolean) ?? null,
          })
          .returning();
        const row = inserted[0]!;
        res.status(201).json({ adapter_type: row.adapterType, created_at: row.createdAt });
      }
    } catch (err) {
      const { status, body } = toHttpError(err);
      res.status(status).json(body);
    }
  });

  return router;
}

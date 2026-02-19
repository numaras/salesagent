import { type Request, type Response, Router } from "express";
import { eq } from "drizzle-orm";
import { resolveFromHeaders, toToolContext } from "../../core/auth/authService.js";
import { NotFoundError, TenantError, toHttpError, ValidationError } from "../../core/errors.js";
import { headersFromNodeRequest } from "../../core/httpHeaders.js";
import { getDb } from "../../db/client.js";
import { getTenantById } from "../../db/repositories/tenant.js";
import { getAdapterConfigByTenant } from "../../db/repositories/adapter-config.js";
import { tenants, adapterConfig } from "../../db/schema.js";

async function resolveTenant(req: Request) {
  const headers = headersFromNodeRequest(req);
  const result = await resolveFromHeaders(headers);
  const ctx = toToolContext(result);
  if (!ctx?.tenantId) throw new TenantError();
  const db = getDb();
  const tenant = await getTenantById(db, ctx.tenantId);
  if (!tenant) throw new NotFoundError("Tenant", ctx.tenantId);
  return { db, ctx, tenant };
}

export function createSettingsRouter(): Router {
  const router = Router();

  router.get("/settings", async (req: Request, res: Response) => {
    try {
      const { db, ctx, tenant } = await resolveTenant(req);
      const adapter = await getAdapterConfigByTenant(db, ctx.tenantId);

      res.json({
        general: {
          tenant_id: tenant.tenantId,
          name: tenant.name,
          subdomain: tenant.subdomain,
          virtual_host: tenant.virtualHost,
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
        // TODO: populate when tenant schema has these columns
        slack: { slack_webhook_url: "", slack_audit_webhook_url: "" },
        ai: { provider: "", model: "", api_key: "" },
        access: { authorized_domains: [] as string[], authorized_emails: [] as string[] },
        business_rules: { approval_mode: "manual", order_name_template: "", line_item_name_template: "" },
      });
    } catch (err) {
      const { status, body } = toHttpError(err);
      res.status(status).json(body);
    }
  });

  router.post("/settings/general", async (req: Request, res: Response) => {
    try {
      const { db, ctx } = await resolveTenant(req);

      const body = req.body as Record<string, unknown>;
      if (!body.name || typeof body.name !== "string") {
        throw new ValidationError("name is required");
      }

      const updated = await db
        .update(tenants)
        .set({
          name: body.name,
          virtualHost: typeof body.virtual_host === "string" ? body.virtual_host : undefined,
          brandManifestPolicy: (body.brand_manifest_policy as string) ?? undefined,
          updatedAt: new Date(),
        })
        .where(eq(tenants.tenantId, ctx.tenantId))
        .returning();

      const row = updated[0]!;
      res.json({
        tenant_id: row.tenantId,
        name: row.name,
        virtual_host: row.virtualHost,
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
      const { db, ctx } = await resolveTenant(req);

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

  // TODO: tenant schema needs slack_webhook_url / slack_audit_webhook_url columns
  router.post("/settings/slack", async (req: Request, res: Response) => {
    try {
      await resolveTenant(req);
      // Stub — returns success until tenants table has slack columns
      res.json({ success: true });
    } catch (err) {
      const { status, body } = toHttpError(err);
      res.status(status).json(body);
    }
  });

  // TODO: tenant schema needs ai_config JSONB column
  router.post("/settings/ai", async (req: Request, res: Response) => {
    try {
      await resolveTenant(req);
      // Stub — returns success until tenants table has ai_config column
      res.json({ success: true });
    } catch (err) {
      const { status, body } = toHttpError(err);
      res.status(status).json(body);
    }
  });

  // TODO: tenant schema needs authorized_domains JSONB array column
  router.post("/settings/domains/add", async (req: Request, res: Response) => {
    try {
      await resolveTenant(req);
      const body = req.body as Record<string, unknown>;
      if (!body.domain || typeof body.domain !== "string") {
        throw new ValidationError("domain is required");
      }
      // Stub — returns success until tenants table has authorized_domains column
      res.json({ success: true });
    } catch (err) {
      const { status, body } = toHttpError(err);
      res.status(status).json(body);
    }
  });

  // TODO: tenant schema needs authorized_domains JSONB array column
  router.post("/settings/domains/remove", async (req: Request, res: Response) => {
    try {
      await resolveTenant(req);
      const body = req.body as Record<string, unknown>;
      if (!body.domain || typeof body.domain !== "string") {
        throw new ValidationError("domain is required");
      }
      // Stub — returns success until tenants table has authorized_domains column
      res.json({ success: true });
    } catch (err) {
      const { status, body } = toHttpError(err);
      res.status(status).json(body);
    }
  });

  // TODO: tenant schema needs authorized_emails JSONB array column
  router.post("/settings/emails/add", async (req: Request, res: Response) => {
    try {
      await resolveTenant(req);
      const body = req.body as Record<string, unknown>;
      if (!body.email || typeof body.email !== "string") {
        throw new ValidationError("email is required");
      }
      // Stub — returns success until tenants table has authorized_emails column
      res.json({ success: true });
    } catch (err) {
      const { status, body } = toHttpError(err);
      res.status(status).json(body);
    }
  });

  // TODO: tenant schema needs authorized_emails JSONB array column
  router.post("/settings/emails/remove", async (req: Request, res: Response) => {
    try {
      await resolveTenant(req);
      const body = req.body as Record<string, unknown>;
      if (!body.email || typeof body.email !== "string") {
        throw new ValidationError("email is required");
      }
      // Stub — returns success until tenants table has authorized_emails column
      res.json({ success: true });
    } catch (err) {
      const { status, body } = toHttpError(err);
      res.status(status).json(body);
    }
  });

  // TODO: tenant schema needs business_rules JSONB column
  router.post("/settings/business-rules", async (req: Request, res: Response) => {
    try {
      await resolveTenant(req);
      // Stub — returns success until tenants table has business-rules columns
      res.json({ success: true });
    } catch (err) {
      const { status, body } = toHttpError(err);
      res.status(status).json(body);
    }
  });

  return router;
}

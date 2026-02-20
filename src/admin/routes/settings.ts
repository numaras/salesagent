import { type Request, type Response, Router } from "express";
import { eq } from "drizzle-orm";
import { resolveFromHeaders, toToolContext } from "../../core/auth/authService.js";
import { NotFoundError, TenantError, toHttpError, ValidationError } from "../../core/errors.js";
import { headersFromNodeRequest } from "../../core/httpHeaders.js";
import { getDb } from "../../db/client.js";
import { getTenantById } from "../../db/repositories/tenant.js";
import { getAdapterConfigByTenant } from "../../db/repositories/adapter-config.js";
import { tenants, adapterConfig, currencyLimits } from "../../db/schema.js";

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
        slack: { 
          slack_webhook_url: tenant.slackWebhookUrl ?? "", 
          slack_audit_webhook_url: tenant.slackAuditWebhookUrl ?? "" 
        },
        ai: { 
          provider: (tenant.aiConfig as Record<string, string>)?.provider ?? "", 
          model: (tenant.aiConfig as Record<string, string>)?.model ?? "", 
          api_key: (tenant.aiConfig as Record<string, string>)?.api_key ?? "" 
        },
        access: { 
          authorized_domains: (tenant.authorizedDomains as string[]) ?? [], 
          authorized_emails: (tenant.authorizedEmails as string[]) ?? [] 
        },
        business_rules: { 
          approval_mode: (tenant.policies as Record<string, string>)?.approval_mode ?? "manual", 
          order_name_template: (tenant.policies as Record<string, string>)?.order_name_template ?? "", 
          line_item_name_template: (tenant.policies as Record<string, string>)?.line_item_name_template ?? "" 
        },
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
      
      const configJson = (body.config_json as Record<string, unknown>) ?? existing?.configJson ?? {};
      if (body.gam_auth_method) {
        configJson.auth_method = body.gam_auth_method;
      }
      
      const gamFields = {
        gamNetworkCode: (body.gam_network_code as string) ?? existing?.gamNetworkCode ?? null,
        gamTraffickerId: (body.gam_trafficker_id as string) ?? existing?.gamTraffickerId ?? null,
        gamRefreshToken: body.gam_auth_method === "oauth" ? ((body.gam_refresh_token as string) ?? existing?.gamRefreshToken ?? null) : null,
        gamServiceAccountJson: body.gam_auth_method === "service_account" ? ((body.gam_service_account_json as string) ?? existing?.gamServiceAccountJson ?? null) : null,
        configJson,
      };

      if (existing) {
        const updated = await db
          .update(adapterConfig)
          .set({
            adapterType: body.adapter_type,
            ...gamFields,
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
            ...gamFields,
            mockDryRun: (body.mock_dry_run as boolean) ?? null,
          })
          .returning();
        const row = inserted[0]!;
        res.status(201).json({ adapter_type: row.adapterType, created_at: row.createdAt });
      }

      if (body.gam_network_currency && typeof body.gam_network_currency === "string") {
        await db
          .insert(currencyLimits)
          .values({
            tenantId: ctx.tenantId,
            currencyCode: body.gam_network_currency,
            minPackageBudget: "100.00",
            maxDailyPackageSpend: "10000.00",
          })
          .onConflictDoNothing();
      }
    } catch (err) {
      const { status, body } = toHttpError(err);
      res.status(status).json(body);
    }
  });

  router.post("/settings/slack", async (req: Request, res: Response) => {
    try {
      const { ctx } = await resolveTenant(req);
      const body = req.body as Record<string, unknown>;
      const db = getDb();
      await db
        .update(tenants)
        .set({
          slackWebhookUrl: (body.slack_webhook_url as string) || null,
          slackAuditWebhookUrl: (body.slack_audit_webhook_url as string) || null,
          updatedAt: new Date(),
        })
        .where(eq(tenants.tenantId, ctx.tenantId));

      res.json({ success: true });
    } catch (err) {
      const { status, body } = toHttpError(err);
      res.status(status).json(body);
    }
  });

  router.post("/settings/ai", async (req: Request, res: Response) => {
    try {
      const { ctx } = await resolveTenant(req);
      const body = req.body as Record<string, unknown>;
      const db = getDb();
      
      const aiConfig = {
        provider: body.provider,
        model: body.model,
        api_key: body.api_key,
      };

      await db
        .update(tenants)
        .set({ aiConfig, updatedAt: new Date() })
        .where(eq(tenants.tenantId, ctx.tenantId));

      res.json({ success: true });
    } catch (err) {
      const { status, body } = toHttpError(err);
      res.status(status).json(body);
    }
  });

  router.post("/settings/domains/add", async (req: Request, res: Response) => {
    try {
      const { ctx } = await resolveTenant(req);
      const body = req.body as Record<string, unknown>;
      if (!body.domain || typeof body.domain !== "string") {
        throw new ValidationError("domain is required");
      }
      const db = getDb();
      const rows = await db.select({ authorizedDomains: tenants.authorizedDomains }).from(tenants).where(eq(tenants.tenantId, ctx.tenantId));
      if (!rows[0]) throw new TenantError();
      const current = Array.isArray(rows[0].authorizedDomains) ? rows[0].authorizedDomains : [];
      if (!current.includes(body.domain)) {
        await db.update(tenants).set({ authorizedDomains: [...current, body.domain], updatedAt: new Date() }).where(eq(tenants.tenantId, ctx.tenantId));
      }
      res.json({ success: true });
    } catch (err) {
      const { status, body } = toHttpError(err);
      res.status(status).json(body);
    }
  });

  router.post("/settings/domains/remove", async (req: Request, res: Response) => {
    try {
      const { ctx } = await resolveTenant(req);
      const body = req.body as Record<string, unknown>;
      if (!body.domain || typeof body.domain !== "string") {
        throw new ValidationError("domain is required");
      }
      const db = getDb();
      const rows = await db.select({ authorizedDomains: tenants.authorizedDomains }).from(tenants).where(eq(tenants.tenantId, ctx.tenantId));
      if (!rows[0]) throw new TenantError();
      const current = Array.isArray(rows[0].authorizedDomains) ? rows[0].authorizedDomains : [];
      await db.update(tenants).set({ authorizedDomains: current.filter((d) => d !== body.domain), updatedAt: new Date() }).where(eq(tenants.tenantId, ctx.tenantId));
      res.json({ success: true });
    } catch (err) {
      const { status, body } = toHttpError(err);
      res.status(status).json(body);
    }
  });

  router.post("/settings/emails/add", async (req: Request, res: Response) => {
    try {
      const { ctx } = await resolveTenant(req);
      const body = req.body as Record<string, unknown>;
      if (!body.email || typeof body.email !== "string") {
        throw new ValidationError("email is required");
      }
      const db = getDb();
      const rows = await db.select({ authorizedEmails: tenants.authorizedEmails }).from(tenants).where(eq(tenants.tenantId, ctx.tenantId));
      if (!rows[0]) throw new TenantError();
      const current = Array.isArray(rows[0].authorizedEmails) ? rows[0].authorizedEmails : [];
      if (!current.includes(body.email)) {
        await db.update(tenants).set({ authorizedEmails: [...current, body.email], updatedAt: new Date() }).where(eq(tenants.tenantId, ctx.tenantId));
      }
      res.json({ success: true });
    } catch (err) {
      const { status, body } = toHttpError(err);
      res.status(status).json(body);
    }
  });

  router.post("/settings/emails/remove", async (req: Request, res: Response) => {
    try {
      const { ctx } = await resolveTenant(req);
      const body = req.body as Record<string, unknown>;
      if (!body.email || typeof body.email !== "string") {
        throw new ValidationError("email is required");
      }
      const db = getDb();
      const rows = await db.select({ authorizedEmails: tenants.authorizedEmails }).from(tenants).where(eq(tenants.tenantId, ctx.tenantId));
      if (!rows[0]) throw new TenantError();
      const current = Array.isArray(rows[0].authorizedEmails) ? rows[0].authorizedEmails : [];
      await db.update(tenants).set({ authorizedEmails: current.filter((e) => e !== body.email), updatedAt: new Date() }).where(eq(tenants.tenantId, ctx.tenantId));
      res.json({ success: true });
    } catch (err) {
      const { status, body } = toHttpError(err);
      res.status(status).json(body);
    }
  });

  router.post("/settings/access/setup-mode", async (req: Request, res: Response) => {
    try {
      const { db, ctx } = await resolveTenant(req);
      const body = req.body as Record<string, unknown>;
      
      if (typeof body.auth_setup_mode !== "boolean") {
        throw new ValidationError("auth_setup_mode is required and must be a boolean");
      }

      await db.update(tenants)
        .set({ authSetupMode: body.auth_setup_mode, updatedAt: new Date() })
        .where(eq(tenants.tenantId, ctx.tenantId));

      res.json({ success: true, auth_setup_mode: body.auth_setup_mode });
    } catch (err) {
      const { status, body } = toHttpError(err);
      res.status(status).json(body);
    }
  });

  router.post("/settings/business-rules", async (req: Request, res: Response) => {
    try {
      const { ctx } = await resolveTenant(req);
      const body = req.body as Record<string, unknown>;
      const db = getDb();
      
      const policies = {
        approval_mode: body.approval_mode,
        order_name_template: body.order_name_template,
        line_item_name_template: body.line_item_name_template,
      };

      await db
        .update(tenants)
        .set({ policies, updatedAt: new Date() })
        .where(eq(tenants.tenantId, ctx.tenantId));

      res.json({ success: true });
    } catch (err) {
      const { status, body } = toHttpError(err);
      res.status(status).json(body);
    }
  });

  router.post("/settings/approximated/status", async (req: Request, res: Response) => {
    try {
      await resolveTenant(req);
      const domain = req.body.domain;
      if (!domain || typeof domain !== "string") throw new ValidationError("domain is required");

      const apiKey = process.env.APPROXIMATED_API_KEY;
      if (!apiKey) {
        res.status(500).json({ error: "APPROXIMATED_API_KEY is not configured" });
        return;
      }

      const response = await fetch(`https://approximated.app/api/v1/virtual_hosts?incoming_address=${domain}`, {
        headers: { "api-key": apiKey },
      });

      if (!response.ok) {
        const errData = await response.text();
        throw new Error(`Approximated API error: ${errData}`);
      }

      const data = await response.json();
      res.json(data);
    } catch (err) {
      const { status, body } = toHttpError(err);
      res.status(status).json(body);
    }
  });

  router.post("/settings/approximated/register", async (req: Request, res: Response) => {
    try {
      await resolveTenant(req);
      const domain = req.body.domain;
      if (!domain || typeof domain !== "string") throw new ValidationError("domain is required");

      const apiKey = process.env.APPROXIMATED_API_KEY;
      if (!apiKey) {
        res.status(500).json({ error: "APPROXIMATED_API_KEY is not configured" });
        return;
      }

      const response = await fetch("https://approximated.app/api/v1/virtual_hosts", {
        method: "POST",
        headers: {
          "api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          incoming_address: domain,
          target_address: req.get("host"),
        }),
      });

      if (!response.ok) {
        const errData = await response.text();
        throw new Error(`Approximated API error: ${errData}`);
      }

      const data = await response.json();
      res.json(data);
    } catch (err) {
      const { status, body } = toHttpError(err);
      res.status(status).json(body);
    }
  });

  router.post("/settings/approximated/token", async (req: Request, res: Response) => {
    try {
      await resolveTenant(req);
      const domain = req.body.domain;
      if (!domain || typeof domain !== "string") throw new ValidationError("domain is required");

      const apiKey = process.env.APPROXIMATED_API_KEY;
      if (!apiKey) {
        res.status(500).json({ error: "APPROXIMATED_API_KEY is not configured" });
        return;
      }

      const response = await fetch("https://approximated.app/api/v1/user_auth_tokens", {
        method: "POST",
        headers: {
          "api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "vhosts",
          target: domain,
        }),
      });

      if (!response.ok) {
        const errData = await response.text();
        throw new Error(`Approximated API error: ${errData}`);
      }

      const data = await response.json();
      res.json(data);
    } catch (err) {
      const { status, body } = toHttpError(err);
      res.status(status).json(body);
    }
  });

  return router;
}

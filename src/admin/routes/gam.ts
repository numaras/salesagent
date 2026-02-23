import { type Request, type Response, Router } from "express";
import { eq } from "drizzle-orm";
import { resolveFromHeaders, toToolContext } from "../../core/auth/authService.js";
import { TenantError, toHttpError, ValidationError } from "../../core/errors.js";
import { headersFromNodeRequest } from "../../core/httpHeaders.js";
import { getDb } from "../../db/client.js";
import { getAdapterConfigByTenant } from "../../db/repositories/adapter-config.js";
import { adapterConfig, currencyLimits } from "../../db/schema.js";
import { encryptForStorage } from "../../core/security/encryption.js";
import { getFormatMetrics } from "../../services/FormatMetricsService.js";

import { createGamClient } from "../../adapters/gam/client.js";

export function createGamRouter(): Router {
  const router = Router();

  router.post("/gam/test-connection", async (req: Request, res: Response) => {
    try {
      const headers = headersFromNodeRequest(req);
      const result = await resolveFromHeaders(headers);
      const ctx = toToolContext(result);
      if (!ctx?.tenantId) throw new TenantError();

      const db = getDb();
      const adapter = await getAdapterConfigByTenant(db, ctx.tenantId);

      if (!adapter?.gamNetworkCode) {
        res.json({ connected: false, error: "GAM network code is not configured" });
        return;
      }

      try {
        const client = createGamClient({
          networkCode: adapter.gamNetworkCode,
          advertiserId: null,
          traffickerId: adapter.gamTraffickerId,
          refreshToken: adapter.gamRefreshToken,
          serviceAccountJson: adapter.gamServiceAccountJson,
        });
        const networkSvc = await client.getNetworkService();
        const network = await networkSvc.getCurrentNetwork();
        
        res.json({ 
          connected: true, 
          network_code: adapter.gamNetworkCode,
          network_name: network.displayName ?? "Unknown Network"
        });
      } catch (err) {
        res.json({ 
          connected: false, 
          error: err instanceof Error ? err.message : "GAM API connection failed" 
        });
      }
    } catch (err) {
      const { status, body } = toHttpError(err);
      res.status(status).json(body);
    }
  });

  router.post("/gam/configure", async (req: Request, res: Response) => {
    try {
      const headers = headersFromNodeRequest(req);
      const result = await resolveFromHeaders(headers);
      const ctx = toToolContext(result);
      if (!ctx?.tenantId) throw new TenantError();

      const {
        auth_method,
        network_code,
        refresh_token,
        service_account_json,
        trafficker_id,
        network_currency,
      } = req.body as {
        auth_method?: string;
        network_code?: string;
        refresh_token?: string;
        service_account_json?: string;
        trafficker_id?: string;
        network_currency?: string;
      };

      if (!network_code) {
        throw new ValidationError("network_code is required");
      }
      if (!auth_method || !["oauth", "service_account"].includes(auth_method)) {
        throw new ValidationError("auth_method must be 'oauth' or 'service_account'");
      }

      const db = getDb();
      const existing = await getAdapterConfigByTenant(db, ctx.tenantId);

      const gamFields = {
        gamNetworkCode: network_code,
        gamTraffickerId: trafficker_id ?? null,
        gamRefreshToken: auth_method === "oauth" && refresh_token ? encryptForStorage(refresh_token) : null,
        gamServiceAccountJson:
          auth_method === "service_account" && service_account_json ? encryptForStorage(service_account_json) : null,
        configJson: { ...(existing?.configJson as Record<string, unknown> ?? {}), auth_method },
        updatedAt: new Date(),
      };

      if (existing) {
        await db
          .update(adapterConfig)
          .set(gamFields)
          .where(eq(adapterConfig.tenantId, ctx.tenantId));
      } else {
        await db.insert(adapterConfig).values({
          tenantId: ctx.tenantId,
          adapterType: "gam",
          ...gamFields,
        });
      }

      const currency = network_currency ?? "USD";
      await db
        .insert(currencyLimits)
        .values({
          tenantId: ctx.tenantId,
          currencyCode: currency,
          minPackageBudget: "100.00",
          maxDailyPackageSpend: "10000.00",
        })
        .onConflictDoNothing();

      res.json({
        network_code,
        trafficker_id: trafficker_id ?? null,
        auth_method,
        currency,
      });
    } catch (err) {
      const { status, body } = toHttpError(err);
      res.status(status).json(body);
    }
  });

  router.get("/gam/config", async (req: Request, res: Response) => {
    try {
      const headers = headersFromNodeRequest(req);
      const result = await resolveFromHeaders(headers);
      const ctx = toToolContext(result);
      if (!ctx?.tenantId) throw new TenantError();

      const db = getDb();
      const adapter = await getAdapterConfigByTenant(db, ctx.tenantId);

      if (!adapter) {
        res.json({ configured: false });
        return;
      }

      const configJson = (adapter.configJson ?? {}) as Record<string, unknown>;
      res.json({
        configured: true,
        network_code: adapter.gamNetworkCode ?? null,
        trafficker_id: adapter.gamTraffickerId ?? null,
        auth_method: configJson.auth_method ?? null,
        has_refresh_token: !!adapter.gamRefreshToken,
        has_service_account: !!adapter.gamServiceAccountJson,
      });
    } catch (err) {
      const { status, body } = toHttpError(err);
      res.status(status).json(body);
    }
  });

  router.get("/gam/reporting", async (req: Request, res: Response) => {
    try {
      const headers = headersFromNodeRequest(req);
      const result = await resolveFromHeaders(headers);
      const ctx = toToolContext(result);
      if (!ctx?.tenantId) throw new TenantError();

      const metrics = await getFormatMetrics(ctx.tenantId);
      res.json({ metrics });
    } catch (err) {
      const { status, body } = toHttpError(err);
      res.status(status).json(body);
    }
  });

  router.get("/gam/line-item/:id", async (req: Request, res: Response) => {
    try {
      const headers = headersFromNodeRequest(req);
      const result = await resolveFromHeaders(headers);
      const ctx = toToolContext(result);
      if (!ctx?.tenantId) throw new TenantError();

      // TODO: Use the real GAM client
      res.json({
        id: req.params.id,
        name: "Mock Line Item",
        status: "DELIVERING",
        orderId: "123",
        stats: { impressions: 1000 }
      });
    } catch (err) {
      const { status, body } = toHttpError(err);
      res.status(status).json(body);
    }
  });

  return router;
}

import { type Request, type Response, Router } from "express";
import { resolveFromHeaders, toToolContext } from "../../core/auth/authService.js";
import { TenantError, toHttpError, ValidationError } from "../../core/errors.js";
import { headersFromNodeRequest } from "../../core/httpHeaders.js";
import { getAuthConfig, updateAuthConfig } from "../../services/AuthConfigService.js";
import { getDb } from "../../db/client.js";
import { tenantAuthConfigs } from "../../db/schema.js";
import { eq } from "drizzle-orm";

export function createOidcRouter(): Router {
  const router = Router();

  router.get("/oidc/config", async (req: Request, res: Response) => {
    try {
      const headers = headersFromNodeRequest(req);
      const result = await resolveFromHeaders(headers);
      const ctx = toToolContext(result);
      if (!ctx?.tenantId) throw new TenantError();

      const config = await getAuthConfig(ctx.tenantId);
      if (!config) {
        res.json({
          oidc_enabled: false,
          provider: null,
          client_id: null,
          discovery_url: null,
          scopes: "openid email profile",
          logout_url: null,
          oidc_verified_at: null,
        });
        return;
      }

      res.json({
        oidc_enabled: config.oidcEnabled,
        provider: config.oidcProvider,
        client_id: config.oidcClientId,
        discovery_url: config.oidcDiscoveryUrl,
        scopes: config.oidcScopes ?? "openid email profile",
        logout_url: config.oidcLogoutUrl,
        oidc_verified_at: config.oidcVerifiedAt,
      });
    } catch (err) {
      const { status, body } = toHttpError(err);
      res.status(status).json(body);
    }
  });

  router.post("/oidc/config", async (req: Request, res: Response) => {
    try {
      const headers = headersFromNodeRequest(req);
      const result = await resolveFromHeaders(headers);
      const ctx = toToolContext(result);
      if (!ctx?.tenantId) throw new TenantError();

      const {
        provider,
        client_id,
        client_secret,
        discovery_url,
        scopes,
        logout_url,
      } = req.body as {
        provider?: string;
        client_id?: string;
        client_secret?: string;
        discovery_url?: string;
        scopes?: string;
        logout_url?: string;
      };

      if (!provider || !client_id || !discovery_url) {
        throw new ValidationError("provider, client_id, and discovery_url are required");
      }

      const row = await updateAuthConfig(ctx.tenantId, {
        oidcProvider: provider,
        oidcClientId: client_id,
        oidcClientSecretEncrypted: client_secret ?? null,
        oidcDiscoveryUrl: discovery_url,
        oidcScopes: scopes ?? "openid email profile",
        oidcLogoutUrl: logout_url ?? null,
      });

      res.json({
        oidc_enabled: row.oidcEnabled,
        provider: row.oidcProvider,
        client_id: row.oidcClientId,
        discovery_url: row.oidcDiscoveryUrl,
        scopes: row.oidcScopes,
        logout_url: row.oidcLogoutUrl,
        oidc_verified_at: row.oidcVerifiedAt,
      });
    } catch (err) {
      const { status, body } = toHttpError(err);
      res.status(status).json(body);
    }
  });

  router.post("/oidc/enable", async (req: Request, res: Response) => {
    try {
      const headers = headersFromNodeRequest(req);
      const result = await resolveFromHeaders(headers);
      const ctx = toToolContext(result);
      if (!ctx?.tenantId) throw new TenantError();

      const config = await getAuthConfig(ctx.tenantId);
      if (!config || !config.oidcClientId || !config.oidcDiscoveryUrl) {
        throw new ValidationError("OIDC config must be saved before enabling");
      }
      if (!config.oidcVerifiedAt) {
        throw new ValidationError("OIDC config must be verified before enabling");
      }

      const db = getDb();
      await db
        .update(tenantAuthConfigs)
        .set({ oidcEnabled: true, updatedAt: new Date() })
        .where(eq(tenantAuthConfigs.tenantId, ctx.tenantId));

      res.json({ oidc_enabled: true });
    } catch (err) {
      const { status, body } = toHttpError(err);
      res.status(status).json(body);
    }
  });

  router.post("/oidc/disable", async (req: Request, res: Response) => {
    try {
      const headers = headersFromNodeRequest(req);
      const result = await resolveFromHeaders(headers);
      const ctx = toToolContext(result);
      if (!ctx?.tenantId) throw new TenantError();

      const db = getDb();
      await db
        .update(tenantAuthConfigs)
        .set({ oidcEnabled: false, updatedAt: new Date() })
        .where(eq(tenantAuthConfigs.tenantId, ctx.tenantId));

      res.json({ oidc_enabled: false });
    } catch (err) {
      const { status, body } = toHttpError(err);
      res.status(status).json(body);
    }
  });

  return router;
}

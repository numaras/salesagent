import { type Request, type Response, Router } from "express";
import { resolveFromHeaders, toToolContext } from "../../core/auth/authService.js";
import { TenantError, toHttpError, ValidationError } from "../../core/errors.js";
import { headersFromNodeRequest } from "../../core/httpHeaders.js";
import { getAuthConfig, updateAuthConfig } from "../../services/AuthConfigService.js";
import { fetchOidcDiscovery, exchangeCodeForTokens, fetchUserInfo } from "../../core/auth/oauth.js";
import { getDb } from "../../db/client.js";
import { tenantAuthConfigs } from "../../db/schema.js";
import { eq } from "drizzle-orm";

function buildRedirectUri(req: Request): string {
  const proto = req.get("x-forwarded-proto") ?? req.protocol ?? "http";
  const host = req.get("x-forwarded-host") ?? req.get("host") ?? "localhost:3000";
  return `${proto}://${host}/admin/api/oidc/callback`;
}

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

  router.post("/oidc/verify", async (req: Request, res: Response) => {
    try {
      const headers = headersFromNodeRequest(req);
      const result = await resolveFromHeaders(headers);
      const ctx = toToolContext(result);
      if (!ctx?.tenantId) throw new TenantError();

      const config = await getAuthConfig(ctx.tenantId);
      if (!config || !config.oidcClientId || !config.oidcDiscoveryUrl) {
        throw new ValidationError("Save OIDC config before verifying");
      }

      const db = getDb();
      await db
        .update(tenantAuthConfigs)
        .set({ oidcVerifiedAt: new Date(), updatedAt: new Date() })
        .where(eq(tenantAuthConfigs.tenantId, ctx.tenantId));

      res.json({ verified: true, oidc_verified_at: new Date().toISOString() });
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

  router.get("/oidc/login", async (req: Request, res: Response) => {
    try {
      const headers = headersFromNodeRequest(req);
      const result = await resolveFromHeaders(headers);
      const ctx = toToolContext(result);
      const tenantId = ctx?.tenantId ?? "default";

      const config = await getAuthConfig(tenantId);
      if (!config?.oidcEnabled || !config.oidcDiscoveryUrl || !config.oidcClientId) {
        res.status(400).send("SSO is not enabled for this tenant. Configure it in SSO Config.");
        return;
      }

      const discovery = await fetchOidcDiscovery(config.oidcDiscoveryUrl);
      const redirectUri = buildRedirectUri(req);
      const scopes = config.oidcScopes ?? "openid email profile";

      const params = new URLSearchParams({
        client_id: config.oidcClientId,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: scopes,
        state: tenantId,
      });

      res.redirect(`${discovery.authorization_endpoint}?${params}`);
    } catch (err) {
      const { body } = toHttpError(err);
      res.status(500).send(`SSO login failed: ${body.message}`);
    }
  });

  router.get("/oidc/callback", async (req: Request, res: Response) => {
    try {
      const code = req.query.code as string | undefined;
      const state = req.query.state as string | undefined;
      if (!code) {
        res.status(400).send("Missing code parameter from identity provider");
        return;
      }

      const tenantId = state ?? "default";
      const config = await getAuthConfig(tenantId);
      if (!config?.oidcDiscoveryUrl || !config.oidcClientId) {
        res.status(400).send("OIDC not configured for this tenant");
        return;
      }

      const discovery = await fetchOidcDiscovery(config.oidcDiscoveryUrl);
      const redirectUri = buildRedirectUri(req);

      const tokens = await exchangeCodeForTokens(discovery.token_endpoint, code, {
        clientId: config.oidcClientId,
        clientSecret: config.oidcClientSecretEncrypted ?? "",
        redirectUri,
        scopes: (config.oidcScopes ?? "openid email profile").split(" "),
      });

      const userInfo = await fetchUserInfo(discovery.userinfo_endpoint, tokens.access_token);

      const db = getDb();
      await db
        .update(tenantAuthConfigs)
        .set({ oidcVerifiedAt: new Date(), updatedAt: new Date() })
        .where(eq(tenantAuthConfigs.tenantId, tenantId));

      if (req.session) {
        const s = req.session as unknown as Record<string, unknown>;
        s.userId = userInfo.sub ?? userInfo.email;
        s.email = userInfo.email;
        s.tenantId = tenantId;
      }

      res.redirect("/admin/");
    } catch (err) {
      const { body } = toHttpError(err);
      res.status(500).send(`SSO callback error: ${body.message}`);
    }
  });

  return router;
}

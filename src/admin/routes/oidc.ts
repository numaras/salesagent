import { type Request, type Response, Router } from "express";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { resolveFromHeaders, toToolContext } from "../../core/auth/authService.js";
import { AuthError, TenantError, toHttpError, ValidationError } from "../../core/errors.js";
import { headersFromNodeRequest } from "../../core/httpHeaders.js";
import { getAuthConfig, updateAuthConfig } from "../../services/AuthConfigService.js";
import { fetchOidcDiscovery, exchangeCodeForTokens, fetchUserInfo } from "../../core/auth/oauth.js";
import { getDb } from "../../db/client.js";
import { getTenantById } from "../../db/repositories/tenant.js";
import { tenantAuthConfigs, users } from "../../db/schema.js";
import { and, eq } from "drizzle-orm";
import { getAdminUrl } from "../../core/domainConfig.js";
import { isUrlSafeWithDns } from "../../core/security/ssrf.js";
import { isMfaEnabled } from "../../core/auth/mfa.js";
import { logOperation } from "../../services/AuditLogService.js";

function buildRedirectUri(req: Request): string {
  const configuredAdminUrl = getAdminUrl();
  if (configuredAdminUrl) {
    return `${configuredAdminUrl}/admin/api/oidc/callback`;
  }
  const host = req.get("host") ?? "localhost:3000";
  return `${req.protocol}://${host}/admin/api/oidc/callback`;
}

function generateOidcState(): string {
  return randomBytes(32).toString("hex");
}

function safeCompare(a: string, b: string): boolean {
  const aa = Buffer.from(a);
  const bb = Buffer.from(b);
  if (aa.length !== bb.length) return false;
  return timingSafeEqual(aa, bb);
}

export function createOidcRouter(): Router {
  const router = Router();

  router.get("/oidc/config", async (req: Request, res: Response) => {
    try {
      const headers = headersFromNodeRequest(req);
      const result = await resolveFromHeaders(headers);
      const ctx = toToolContext(result);
      if (!ctx?.tenantId) throw new TenantError();
      const db = getDb();
      const tenant = await getTenantById(db, ctx.tenantId);

      const config = await getAuthConfig(ctx.tenantId);
      if (!config) {
        res.json({
          oidc_enabled: false,
          auth_setup_mode: tenant?.authSetupMode ?? true,
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
        auth_setup_mode: tenant?.authSetupMode ?? true,
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
      if (!(await isUrlSafeWithDns(discovery_url))) {
        throw new ValidationError("discovery_url blocked by SSRF policy");
      }
      const existingConfig = await getAuthConfig(ctx.tenantId);

      const row = await updateAuthConfig(ctx.tenantId, {
        oidcProvider: provider,
        oidcClientId: client_id,
        oidcClientSecretEncrypted:
          typeof client_secret === "string" && client_secret.trim().length > 0
            ? client_secret.trim()
            : (existingConfig?.oidcClientSecretEncrypted ?? null),
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
      const state = generateOidcState();
      const session = req.session as unknown as Record<string, unknown>;
      session.oidcState = state;
      session.oidcStateTenantId = tenantId;
      session.oidcStateCreatedAt = Date.now();

      const params = new URLSearchParams({
        client_id: config.oidcClientId,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: scopes,
        state,
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
      if (!state) {
        throw new AuthError("Missing OIDC state");
      }
      const session = req.session as unknown as Record<string, unknown>;
      const expectedState = typeof session.oidcState === "string" ? session.oidcState : "";
      const expectedTenantId = typeof session.oidcStateTenantId === "string" ? session.oidcStateTenantId : "";
      const stateCreatedAt = Number(session.oidcStateCreatedAt ?? 0);
      delete session.oidcState;
      delete session.oidcStateTenantId;
      delete session.oidcStateCreatedAt;

      if (!expectedState || !safeCompare(expectedState, state)) {
        throw new AuthError("Invalid OIDC state");
      }
      if (!stateCreatedAt || Date.now() - stateCreatedAt > 10 * 60 * 1000) {
        throw new AuthError("Expired OIDC state");
      }
      if (!expectedTenantId) {
        throw new AuthError("Missing tenant in OIDC session");
      }
      const tenantId = expectedTenantId;
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
      if (!userInfo.email) {
        throw new AuthError("No email returned from identity provider");
      }

      const db = getDb();
      const matchedUsers = await db
        .select()
        .from(users)
        .where(and(eq(users.email, userInfo.email), eq(users.tenantId, tenantId)))
        .limit(1);
      const user = matchedUsers[0];
      if (!user || !user.isActive) {
        res.status(403).send("User not found or not authorized for this tenant.");
        return;
      }
      await db
        .update(tenantAuthConfigs)
        .set({ oidcVerifiedAt: new Date(), updatedAt: new Date() })
        .where(eq(tenantAuthConfigs.tenantId, tenantId));

      if (req.session) {
        const s = req.session as unknown as Record<string, unknown>;
        s.authenticated = true;
        s.userId = user.userId;
        s.email = user.email;
        s.role = user.role;
        s.tenantId = tenantId;
        s.loginTime = Date.now();
        s.mfaVerified = !(await isMfaEnabled(tenantId));
      }
      await logOperation(
        tenantId,
        "auth:oidc_login",
        user.userId,
        user.email,
        true,
        { ip: req.ip, mfa_required: await isMfaEnabled(tenantId) }
      );

      res.redirect("/admin/");
    } catch (err) {
      const tenantId = (req.session as unknown as Record<string, unknown>)?.tenantId;
      if (typeof tenantId === "string") {
        await logOperation(
          tenantId,
          "auth:oidc_login",
          null,
          null,
          false,
          { ip: req.ip },
          err instanceof Error ? err.message : "unknown_error"
        ).catch(() => undefined);
      }
      const { body } = toHttpError(err);
      res.status(500).send(`SSO callback error: ${body.message}`);
    }
  });

  return router;
}

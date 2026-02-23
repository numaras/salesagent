import { type Request, type Response, Router } from "express";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { validateTestCredentials, buildGoogleOAuthUrl, exchangeCodeForTokens, fetchUserInfo } from "../../core/auth/oauth.js";
import { AuthError, toHttpError } from "../../core/errors.js";
import { getDb } from "../../db/client.js";
import { users } from "../../db/schema.js";

import { resolveFromHeaders, toToolContext } from "../../core/auth/authService.js";
import { headersFromNodeRequest } from "../../core/httpHeaders.js";
import { getTenantById } from "../../db/repositories/tenant.js";
import { getAdminUrl } from "../../core/domainConfig.js";
import { isMfaEnabled, verifyMfaCode } from "../../core/auth/mfa.js";
import { logOperation } from "../../services/AuditLogService.js";

interface LockoutState {
  failures: number;
  firstFailureAt: number;
  lockedUntil: number;
}

const AUTH_LOCKOUT_THRESHOLD = Number(process.env.AUTH_LOCKOUT_THRESHOLD ?? 5);
const AUTH_LOCKOUT_WINDOW_MS = Number(process.env.AUTH_LOCKOUT_WINDOW_MS ?? 15 * 60 * 1000);
const AUTH_LOCKOUT_DURATION_MS = Number(process.env.AUTH_LOCKOUT_DURATION_MS ?? 15 * 60 * 1000);
const authFailuresByIp = new Map<string, LockoutState>();

function sessionData(req: Request): Record<string, unknown> {
  return req.session as unknown as Record<string, unknown>;
}

function generateOAuthState(): string {
  return randomBytes(32).toString("hex");
}

function isSafeEqual(a: string, b: string): boolean {
  const aa = Buffer.from(a);
  const bb = Buffer.from(b);
  if (aa.length !== bb.length) return false;
  return timingSafeEqual(aa, bb);
}

function getGoogleRedirectUri(req: Request): string {
  const configuredAdminUrl = getAdminUrl();
  if (configuredAdminUrl) {
    return `${configuredAdminUrl}/admin/api/auth/google/callback`;
  }
  const host = req.get("host") ?? "localhost:3000";
  return `${req.protocol}://${host}/admin/api/auth/google/callback`;
}

function lockoutKey(req: Request): string {
  return req.ip || "unknown";
}

function checkLockout(req: Request): void {
  const key = lockoutKey(req);
  const current = authFailuresByIp.get(key);
  if (!current) return;
  if (current.lockedUntil > Date.now()) {
    const secondsRemaining = Math.ceil((current.lockedUntil - Date.now()) / 1000);
    throw new AuthError(`Too many failed login attempts. Try again in ${secondsRemaining}s.`);
  }
  if (current.lockedUntil <= Date.now()) {
    authFailuresByIp.delete(key);
  }
}

function recordAuthFailure(req: Request): void {
  const key = lockoutKey(req);
  const now = Date.now();
  const current = authFailuresByIp.get(key);
  if (!current || now - current.firstFailureAt > AUTH_LOCKOUT_WINDOW_MS) {
    authFailuresByIp.set(key, { failures: 1, firstFailureAt: now, lockedUntil: 0 });
    return;
  }

  current.failures += 1;
  if (current.failures >= AUTH_LOCKOUT_THRESHOLD) {
    current.lockedUntil = now + AUTH_LOCKOUT_DURATION_MS;
  }
  authFailuresByIp.set(key, current);
}

function clearAuthFailures(req: Request): void {
  authFailuresByIp.delete(lockoutKey(req));
}

export function createAuthRouter(): Router {
  const router = Router();

  router.post("/auth/test-login", async (req: Request, res: Response) => {
    try {
      checkLockout(req);
      const { password } = req.body as { password?: string };
      if (!password || !validateTestCredentials(password)) {
        recordAuthFailure(req);
        throw new AuthError("Invalid credentials");
      }

      const headers = headersFromNodeRequest(req);
      const result = await resolveFromHeaders(headers);
      const ctx = toToolContext(result);
      
      // Explicitly block test login if setup mode is disabled, regardless of whether tenant resolved
      const tenantId = ctx?.tenantId;
      if (!tenantId) {
        recordAuthFailure(req);
        throw new AuthError("Could not resolve tenant. Please access via the correct domain.");
      }
      const db = getDb();
      const tenant = await getTenantById(db, tenantId);
      if (!tenant) {
        recordAuthFailure(req);
        throw new AuthError("Tenant not found.");
      }
      if (!tenant.authSetupMode) {
        recordAuthFailure(req);
        throw new AuthError("Guest login is disabled for this tenant. Please use SSO.");
      }

      const sess = sessionData(req);
      sess.authenticated = true;
      sess.tenantId = tenantId;
      sess.role = "admin";
      sess.email = "guest-admin@local";
      sess.userId = `guest_${tenantId}`;
      sess.loginTime = Date.now();
      sess.mfaVerified = !(await isMfaEnabled(tenantId));
      clearAuthFailures(req);
      await logOperation(
        tenantId,
        "auth:test_login",
        String(sess.userId),
        String(sess.email),
        true,
        { ip: req.ip, mfa_required: await isMfaEnabled(tenantId) }
      );
      res.json({ success: true, token: "test-token" });
    } catch (err) {
      const headers = headersFromNodeRequest(req);
      const result = await resolveFromHeaders(headers).catch(() => null);
      const tenantId = result?.tenantId ?? null;
      if (tenantId) {
        await logOperation(
          tenantId,
          "auth:test_login",
          null,
          null,
          false,
          { ip: req.ip },
          err instanceof Error ? err.message : "unknown_error"
        ).catch(() => undefined);
      }
      const { status, body } = toHttpError(err);
      res.status(status).json(body);
    }
  });

  router.get("/auth/session", (req: Request, res: Response) => {
    const sess = sessionData(req);
    if (sess.authenticated) {
      res.json({
        authenticated: true,
        email: sess.email ?? null,
        role: sess.role ?? null,
        userId: sess.userId ?? null,
        tenantId: sess.tenantId ?? null,
        loginTime: sess.loginTime ?? null,
        mfa_required: sess.mfaVerified === false,
      });
    } else {
      res.json({ authenticated: false });
    }
  });

  router.post("/auth/mfa/verify", async (req: Request, res: Response) => {
    try {
      checkLockout(req);
      const sess = sessionData(req);
      if (!sess.authenticated) {
        throw new AuthError("Authentication required before MFA verification.");
      }
      const tenantId = typeof sess.tenantId === "string" ? sess.tenantId : "";
      if (!tenantId) {
        throw new AuthError("Tenant context missing for MFA.");
      }
      if (!(await isMfaEnabled(tenantId))) {
        sess.mfaVerified = true;
        res.json({ success: true, mfa_required: false });
        return;
      }

      const { code } = req.body as { code?: string };
      if (!code || !(await verifyMfaCode(tenantId, code))) {
        recordAuthFailure(req);
        throw new AuthError("Invalid MFA code.");
      }

      sess.mfaVerified = true;
      clearAuthFailures(req);
      await logOperation(
        tenantId,
        "auth:mfa_verify",
        typeof sess.userId === "string" ? sess.userId : null,
        typeof sess.email === "string" ? sess.email : null,
        true,
        { ip: req.ip }
      );
      res.json({ success: true, mfa_required: false });
    } catch (err) {
      const sess = sessionData(req);
      const tenantId = typeof sess.tenantId === "string" ? sess.tenantId : null;
      if (tenantId) {
        await logOperation(
          tenantId,
          "auth:mfa_verify",
          typeof sess.userId === "string" ? sess.userId : null,
          typeof sess.email === "string" ? sess.email : null,
          false,
          { ip: req.ip },
          err instanceof Error ? err.message : "unknown_error"
        ).catch(() => undefined);
      }
      const { status, body } = toHttpError(err);
      res.status(status).json(body);
    }
  });

  router.post("/auth/logout", (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        const { status, body } = toHttpError(err);
        res.status(status).json(body);
        return;
      }
      res.json({ success: true });
    });
  });

  router.get("/auth/google", (req: Request, res: Response) => {
    try {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
      if (!clientId || !clientSecret) {
        res.status(400).json({ error: "Google OAuth is not configured" });
        return;
      }

      const redirectUri = getGoogleRedirectUri(req);
      const sess = sessionData(req);
      const state = generateOAuthState();
      sess.oauthState = state;
      sess.oauthStateCreatedAt = Date.now();

      const url = buildGoogleOAuthUrl(
        { clientId, clientSecret, scopes: ["openid", "email", "profile"], redirectUri },
        state,
      );
      res.redirect(url);
    } catch (err) {
      const { status, body } = toHttpError(err);
      res.status(status).json(body);
    }
  });

  router.get("/auth/google/callback", async (req: Request, res: Response) => {
    try {
      const code = req.query.code as string | undefined;
      const state = req.query.state as string | undefined;
      if (!code) {
        throw new AuthError("Missing authorization code");
      }
      if (!state) {
        throw new AuthError("Missing OAuth state");
      }

      const sess = sessionData(req);
      const expectedState = typeof sess.oauthState === "string" ? sess.oauthState : "";
      const stateIssuedAt = Number(sess.oauthStateCreatedAt ?? 0);
      delete sess.oauthState;
      delete sess.oauthStateCreatedAt;
      if (!expectedState || !isSafeEqual(expectedState, state)) {
        throw new AuthError("Invalid OAuth state");
      }
      if (!stateIssuedAt || Date.now() - stateIssuedAt > 10 * 60 * 1000) {
        throw new AuthError("Expired OAuth state");
      }

      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
      if (!clientId || !clientSecret) {
        throw new AuthError("Google OAuth is not configured");
      }

      const redirectUri = getGoogleRedirectUri(req);

      const tokens = await exchangeCodeForTokens(
        "https://oauth2.googleapis.com/token",
        code,
        { clientId, clientSecret, scopes: ["openid", "email", "profile"], redirectUri },
      );

      const userInfo = await fetchUserInfo(
        "https://openidconnect.googleapis.com/v1/userinfo",
        tokens.access_token,
      );

      if (!userInfo.email) {
        throw new AuthError("No email returned from Google");
      }

      const db = getDb();
      const rows = await db
        .select()
        .from(users)
        .where(eq(users.email, userInfo.email))
        .limit(1);
      const user = rows[0];

      if (!user) {
        res.status(403).send("User not found. Contact your administrator to be added.");
        return;
      }

      const loggedInSession = sessionData(req);
      loggedInSession.authenticated = true;
      loggedInSession.userId = user.userId;
      loggedInSession.tenantId = user.tenantId;
      loggedInSession.email = user.email;
      loggedInSession.role = user.role;
      loggedInSession.loginTime = Date.now();
      loggedInSession.mfaVerified = !(await isMfaEnabled(user.tenantId));
      clearAuthFailures(req);
      await logOperation(
        user.tenantId,
        "auth:google_login",
        user.userId,
        user.email,
        true,
        { ip: req.ip, mfa_required: await isMfaEnabled(user.tenantId) }
      );

      res.redirect("/admin/");
    } catch (err) {
      recordAuthFailure(req);
      const { status, body } = toHttpError(err);
      res.status(status).json(body);
    }
  });

  return router;
}

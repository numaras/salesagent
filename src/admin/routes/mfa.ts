import { type Request, type Response, Router } from "express";
import { AuthError, toHttpError, ValidationError } from "../../core/errors.js";
import {
  clearMfaSecret,
  generateBase32Secret,
  getMfaSource,
  getOtpAuthUri,
  isMfaEnabled,
  saveMfaSecret,
  verifyMfaCode,
  verifyMfaCodeForSecret,
} from "../../core/auth/mfa.js";
import { logOperation } from "../../services/AuditLogService.js";

function sessionData(req: Request): Record<string, unknown> {
  return req.session as unknown as Record<string, unknown>;
}

function getTenantId(req: Request): string {
  const sess = sessionData(req);
  const tenantId = typeof sess.tenantId === "string" ? sess.tenantId : "";
  if (!tenantId) throw new AuthError("Tenant context missing.");
  return tenantId;
}

export function createMfaRouter(): Router {
  const router = Router();

  router.get("/mfa/config", async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      res.json({
        enabled: await isMfaEnabled(tenantId),
        source: await getMfaSource(tenantId),
      });
    } catch (err) {
      const { status, body } = toHttpError(err);
      res.status(status).json(body);
    }
  });

  router.post("/mfa/setup/initiate", async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const source = await getMfaSource(tenantId);
      if (source === "env") {
        throw new ValidationError("MFA is currently configured via ADMIN_MFA_SECRET env var. Remove it to manage MFA in UI.");
      }
      const secret = generateBase32Secret(32);
      const account = `${tenantId}:${String(sessionData(req).email ?? "admin")}`;
      const otpauthUri = getOtpAuthUri(secret, account);
      const sess = sessionData(req);
      sess.pendingMfaSecret = secret;
      sess.pendingMfaCreatedAt = Date.now();

      res.json({
        secret,
        otpauth_uri: otpauthUri,
      });
    } catch (err) {
      const { status, body } = toHttpError(err);
      res.status(status).json(body);
    }
  });

  router.post("/mfa/setup/confirm", async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const sess = sessionData(req);
      const pendingSecret = typeof sess.pendingMfaSecret === "string" ? sess.pendingMfaSecret : "";
      const pendingCreatedAt = Number(sess.pendingMfaCreatedAt ?? 0);
      if (!pendingSecret || !pendingCreatedAt || Date.now() - pendingCreatedAt > 10 * 60 * 1000) {
        throw new ValidationError("MFA setup session expired. Start setup again.");
      }

      const { code } = req.body as { code?: string };
      if (!code || !verifyMfaCodeForSecret(pendingSecret, code)) {
        throw new ValidationError("Invalid MFA code.");
      }

      await saveMfaSecret(
        tenantId,
        pendingSecret,
        typeof sess.email === "string" ? sess.email : undefined
      );
      sess.pendingMfaSecret = undefined;
      sess.pendingMfaCreatedAt = undefined;
      sess.mfaVerified = true;

      await logOperation(
        tenantId,
        "auth:mfa_enable",
        typeof sess.userId === "string" ? sess.userId : null,
        typeof sess.email === "string" ? sess.email : null,
        true,
        { ip: req.ip }
      );

      res.json({ success: true, enabled: true });
    } catch (err) {
      const tenantId = (() => {
        try { return getTenantId(req); } catch { return null; }
      })();
      if (tenantId) {
        const sess = sessionData(req);
        await logOperation(
          tenantId,
          "auth:mfa_enable",
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

  router.post("/mfa/disable", async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const source = await getMfaSource(tenantId);
      if (source === "env") {
        throw new ValidationError("MFA is currently configured via ADMIN_MFA_SECRET env var. Remove it to manage MFA in UI.");
      }
      const { code } = req.body as { code?: string };
      if (!code || !(await verifyMfaCode(tenantId, code))) {
        throw new ValidationError("Invalid MFA code.");
      }

      const sess = sessionData(req);
      await clearMfaSecret(tenantId, typeof sess.email === "string" ? sess.email : undefined);
      sess.mfaVerified = true;

      await logOperation(
        tenantId,
        "auth:mfa_disable",
        typeof sess.userId === "string" ? sess.userId : null,
        typeof sess.email === "string" ? sess.email : null,
        true,
        { ip: req.ip }
      );

      res.json({ success: true, enabled: false });
    } catch (err) {
      const { status, body } = toHttpError(err);
      res.status(status).json(body);
    }
  });

  return router;
}

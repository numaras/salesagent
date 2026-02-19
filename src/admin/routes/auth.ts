import { type Request, type Response, Router } from "express";
import { eq } from "drizzle-orm";
import { validateTestCredentials, buildGoogleOAuthUrl, exchangeCodeForTokens, fetchUserInfo } from "../../core/auth/oauth.js";
import { AuthError, toHttpError } from "../../core/errors.js";
import { getDb } from "../../db/client.js";
import { users } from "../../db/schema.js";

function sessionData(req: Request): Record<string, unknown> {
  return req.session as unknown as Record<string, unknown>;
}

export function createAuthRouter(): Router {
  const router = Router();

  router.post("/auth/test-login", (req: Request, res: Response) => {
    try {
      const { password } = req.body as { password?: string };
      if (!password || !validateTestCredentials(password)) {
        throw new AuthError("Invalid credentials");
      }
      const sess = sessionData(req);
      sess.authenticated = true;
      sess.loginTime = Date.now();
      res.json({ success: true, token: "test-token" });
    } catch (err) {
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
      });
    } else {
      res.json({ authenticated: false });
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

      const redirectUri = `${req.protocol}://${req.get("host")}/admin/api/auth/google/callback`;
      const sess = sessionData(req);
      const state = String(Date.now());
      sess.oauthState = state;

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
      if (!code) {
        throw new AuthError("Missing authorization code");
      }

      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
      if (!clientId || !clientSecret) {
        throw new AuthError("Google OAuth is not configured");
      }

      const redirectUri = `${req.protocol}://${req.get("host")}/admin/api/auth/google/callback`;

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

      const sess = sessionData(req);
      sess.authenticated = true;
      sess.userId = user.userId;
      sess.tenantId = user.tenantId;
      sess.email = user.email;
      sess.role = user.role;
      sess.loginTime = Date.now();

      res.redirect("/admin/");
    } catch (err) {
      const { status, body } = toHttpError(err);
      res.status(status).json(body);
    }
  });

  return router;
}

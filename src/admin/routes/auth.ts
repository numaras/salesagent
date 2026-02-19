import { type Request, type Response, Router } from "express";
import { validateTestCredentials } from "../../core/auth/oauth.js";
import { AuthError, toHttpError } from "../../core/errors.js";

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
      res.json({ authenticated: true, loginTime: sess.loginTime ?? null });
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

  return router;
}

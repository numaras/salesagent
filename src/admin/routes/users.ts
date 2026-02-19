import { type Request, type Response, Router } from "express";
import { eq } from "drizzle-orm";
import { resolveFromHeaders, toToolContext } from "../../core/auth/authService.js";
import { NotFoundError, TenantError, toHttpError, ValidationError } from "../../core/errors.js";
import { headersFromNodeRequest } from "../../core/httpHeaders.js";
import { getDb } from "../../db/client.js";
import { listUsersByTenant, getUserById, insertUser } from "../../db/repositories/user.js";
import { users } from "../../db/schema.js";

function paramStr(v: string | string[] | undefined): string | undefined {
  return typeof v === "string" ? v : v?.[0];
}

export function createUsersRouter(): Router {
  const router = Router();

  router.get("/users", async (req: Request, res: Response) => {
    try {
      const headers = headersFromNodeRequest(req);
      const result = await resolveFromHeaders(headers);
      const ctx = toToolContext(result);
      if (!ctx?.tenantId) throw new TenantError();
      const db = getDb();
      const rows = await listUsersByTenant(db, ctx.tenantId);
      res.json({
        users: rows.map((r) => ({
          user_id: r.userId,
          email: r.email,
          name: r.name,
          role: r.role,
          is_active: r.isActive,
          last_login: r.lastLogin,
          created_at: r.createdAt,
        })),
      });
    } catch (err) {
      const { status, body } = toHttpError(err);
      res.status(status).json(body);
    }
  });

  router.post("/users", async (req: Request, res: Response) => {
    try {
      const headers = headersFromNodeRequest(req);
      const result = await resolveFromHeaders(headers);
      const ctx = toToolContext(result);
      if (!ctx?.tenantId) throw new TenantError();
      const db = getDb();
      const body = req.body as Record<string, unknown>;
      if (!body.user_id || !body.email || !body.name || !body.role) {
        throw new ValidationError("user_id, email, name, and role are required");
      }
      const row = await insertUser(db, {
        userId: body.user_id as string,
        tenantId: ctx.tenantId,
        email: body.email as string,
        name: body.name as string,
        role: body.role as string,
        googleId: (body.google_id as string) ?? null,
      });
      res.status(201).json({ user_id: row.userId, email: row.email, name: row.name });
    } catch (err) {
      const { status, body } = toHttpError(err);
      res.status(status).json(body);
    }
  });

  router.post("/users/:userId/toggle", async (req: Request, res: Response) => {
    try {
      const db = getDb();
      const userId = paramStr(req.params.userId);
      if (!userId) throw new NotFoundError("User", "undefined");

      const existing = await getUserById(db, userId);
      if (!existing) throw new NotFoundError("User", userId);

      const updated = await db
        .update(users)
        .set({ isActive: !existing.isActive })
        .where(eq(users.userId, userId))
        .returning();

      const row = updated[0]!;
      res.json({ user_id: row.userId, is_active: row.isActive });
    } catch (err) {
      const { status, body } = toHttpError(err);
      res.status(status).json(body);
    }
  });

  return router;
}

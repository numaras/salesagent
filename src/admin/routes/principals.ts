import { type Request, type Response, Router } from "express";
import { and, eq } from "drizzle-orm";
import { resolveFromHeaders, toToolContext } from "../../core/auth/authService.js";
import { NotFoundError, TenantError, toHttpError, ValidationError } from "../../core/errors.js";
import { headersFromNodeRequest } from "../../core/httpHeaders.js";
import { getDb } from "../../db/client.js";
import { getPrincipalById } from "../../db/repositories/principal.js";
import { principals } from "../../db/schema.js";

function paramStr(v: string | string[] | undefined): string | undefined {
  return typeof v === "string" ? v : v?.[0];
}

export function createPrincipalsRouter(): Router {
  const router = Router();

  router.get("/principals", async (req: Request, res: Response) => {
    try {
      const headers = headersFromNodeRequest(req);
      const result = await resolveFromHeaders(headers);
      const ctx = toToolContext(result);
      if (!ctx?.tenantId) throw new TenantError();
      const db = getDb();
      const rows = await db
        .select()
        .from(principals)
        .where(eq(principals.tenantId, ctx.tenantId));
      res.json({
        principals: rows.map((r) => ({
          principal_id: r.principalId,
          name: r.name,
          created_at: r.createdAt,
          updated_at: r.updatedAt,
        })),
      });
    } catch (err) {
      const { status, body } = toHttpError(err);
      res.status(status).json(body);
    }
  });

  router.get("/principals/:principalId", async (req: Request, res: Response) => {
    try {
      const headers = headersFromNodeRequest(req);
      const result = await resolveFromHeaders(headers);
      const ctx = toToolContext(result);
      if (!ctx?.tenantId) throw new TenantError();
      const db = getDb();
      const principalId = paramStr(req.params.principalId);
      if (!principalId) throw new NotFoundError("Principal", "undefined");
      const row = await getPrincipalById(db, ctx.tenantId, principalId);
      if (!row) throw new NotFoundError("Principal", principalId);
      res.json({
        principal_id: row.principalId,
        name: row.name,
        platform_mappings: row.platformMappings,
        created_at: row.createdAt,
        updated_at: row.updatedAt,
      });
    } catch (err) {
      const { status, body } = toHttpError(err);
      res.status(status).json(body);
    }
  });

  router.post("/principals", async (req: Request, res: Response) => {
    try {
      const headers = headersFromNodeRequest(req);
      const result = await resolveFromHeaders(headers);
      const ctx = toToolContext(result);
      if (!ctx?.tenantId) throw new TenantError();
      const db = getDb();
      const body = req.body as Record<string, unknown>;
      if (!body.principal_id || !body.name || !body.access_token) {
        throw new ValidationError("principal_id, name, and access_token are required");
      }
      const inserted = await db
        .insert(principals)
        .values({
          tenantId: ctx.tenantId,
          principalId: body.principal_id as string,
          name: body.name as string,
          accessToken: body.access_token as string,
          platformMappings: (body.platform_mappings as unknown) ?? {},
        })
        .returning();
      const row = inserted[0]!;
      res.status(201).json({ principal_id: row.principalId, name: row.name });
    } catch (err) {
      const { status, body } = toHttpError(err);
      res.status(status).json(body);
    }
  });

  router.put("/principals/:principalId", async (req: Request, res: Response) => {
    try {
      const headers = headersFromNodeRequest(req);
      const result = await resolveFromHeaders(headers);
      const ctx = toToolContext(result);
      if (!ctx?.tenantId) throw new TenantError();
      const db = getDb();
      const principalId = paramStr(req.params.principalId);
      if (!principalId) throw new NotFoundError("Principal", "undefined");

      const existing = await getPrincipalById(db, ctx.tenantId, principalId);
      if (!existing) throw new NotFoundError("Principal", principalId);

      const body = req.body as Record<string, unknown>;
      const updated = await db
        .update(principals)
        .set({
          name: (body.name as string) ?? existing.name,
          platformMappings: (body.platform_mappings as unknown) ?? existing.platformMappings,
          updatedAt: new Date(),
        })
        .where(
          and(eq(principals.tenantId, ctx.tenantId), eq(principals.principalId, principalId))
        )
        .returning();

      const row = updated[0]!;
      res.json({ principal_id: row.principalId, name: row.name, updated_at: row.updatedAt });
    } catch (err) {
      const { status, body } = toHttpError(err);
      res.status(status).json(body);
    }
  });

  router.delete("/principals/:principalId", async (req: Request, res: Response) => {
    try {
      const headers = headersFromNodeRequest(req);
      const result = await resolveFromHeaders(headers);
      const ctx = toToolContext(result);
      if (!ctx?.tenantId) throw new TenantError();
      const db = getDb();
      const principalId = paramStr(req.params.principalId);
      if (!principalId) throw new NotFoundError("Principal", "undefined");

      const existing = await getPrincipalById(db, ctx.tenantId, principalId);
      if (!existing) throw new NotFoundError("Principal", principalId);

      await db
        .delete(principals)
        .where(
          and(eq(principals.tenantId, ctx.tenantId), eq(principals.principalId, principalId))
        );

      res.json({ success: true, principal_id: principalId });
    } catch (err) {
      const { status, body } = toHttpError(err);
      res.status(status).json(body);
    }
  });

  return router;
}

import { type Request, type Response, Router } from "express";
import { eq } from "drizzle-orm";
import { resolveFromHeaders, toToolContext } from "../../core/auth/authService.js";
import { NotFoundError, TenantError, toHttpError } from "../../core/errors.js";
import { headersFromNodeRequest } from "../../core/httpHeaders.js";
import { getDb } from "../../db/client.js";
import {
  listCreativesByTenant,
  getCreativeById,
} from "../../db/repositories/creative.js";
import { creatives } from "../../db/schema.js";

function paramStr(v: string | string[] | undefined): string | undefined {
  return typeof v === "string" ? v : v?.[0];
}

export function createCreativesRouter(): Router {
  const router = Router();

  router.get("/creatives", async (req: Request, res: Response) => {
    try {
      const headers = headersFromNodeRequest(req);
      const result = await resolveFromHeaders(headers);
      const ctx = toToolContext(result);
      if (!ctx?.tenantId) throw new TenantError();
      const db = getDb();

      const rows = await listCreativesByTenant(db, ctx.tenantId);
      res.json({
        creatives: rows.map((r) => ({
          creative_id: r.creativeId,
          name: r.name,
          format: r.format,
          status: r.status,
          agent_url: r.agentUrl,
          principal_id: r.principalId,
          created_at: r.createdAt,
        })),
      });
    } catch (err) {
      const { status, body } = toHttpError(err);
      res.status(status).json(body);
    }
  });

  router.get("/creatives/:creativeId", async (req: Request, res: Response) => {
    try {
      const headers = headersFromNodeRequest(req);
      const result = await resolveFromHeaders(headers);
      const ctx = toToolContext(result);
      if (!ctx?.tenantId) throw new TenantError();
      const db = getDb();
      const creativeId = paramStr(req.params.creativeId);
      if (!creativeId) throw new NotFoundError("Creative", "undefined");

      const row = await getCreativeById(db, creativeId);
      if (!row || row.tenantId !== ctx.tenantId) {
        throw new NotFoundError("Creative", creativeId);
      }

      res.json({
        creative_id: row.creativeId,
        name: row.name,
        format: row.format,
        status: row.status,
        agent_url: row.agentUrl,
        principal_id: row.principalId,
        data: row.data,
        created_at: row.createdAt,
        updated_at: row.updatedAt,
      });
    } catch (err) {
      const { status, body } = toHttpError(err);
      res.status(status).json(body);
    }
  });

  router.post("/creatives/:creativeId/approve", async (req: Request, res: Response) => {
    try {
      const headers = headersFromNodeRequest(req);
      const result = await resolveFromHeaders(headers);
      const ctx = toToolContext(result);
      if (!ctx?.tenantId) throw new TenantError();
      const db = getDb();
      const creativeId = paramStr(req.params.creativeId);
      if (!creativeId) throw new NotFoundError("Creative", "undefined");

      const row = await getCreativeById(db, creativeId);
      if (!row || row.tenantId !== ctx.tenantId) {
        throw new NotFoundError("Creative", creativeId);
      }

      const updated = await db
        .update(creatives)
        .set({ status: "approved", updatedAt: new Date() })
        .where(eq(creatives.creativeId, creativeId))
        .returning();

      const r = updated[0]!;
      res.json({ success: true, creative_id: r.creativeId, status: r.status });
    } catch (err) {
      const { status, body } = toHttpError(err);
      res.status(status).json(body);
    }
  });

  router.post("/creatives/:creativeId/reject", async (req: Request, res: Response) => {
    try {
      const headers = headersFromNodeRequest(req);
      const result = await resolveFromHeaders(headers);
      const ctx = toToolContext(result);
      if (!ctx?.tenantId) throw new TenantError();
      const db = getDb();
      const creativeId = paramStr(req.params.creativeId);
      if (!creativeId) throw new NotFoundError("Creative", "undefined");

      const row = await getCreativeById(db, creativeId);
      if (!row || row.tenantId !== ctx.tenantId) {
        throw new NotFoundError("Creative", creativeId);
      }

      const updated = await db
        .update(creatives)
        .set({ status: "rejected", updatedAt: new Date() })
        .where(eq(creatives.creativeId, creativeId))
        .returning();

      const r = updated[0]!;
      res.json({ success: true, creative_id: r.creativeId, status: r.status });
    } catch (err) {
      const { status, body } = toHttpError(err);
      res.status(status).json(body);
    }
  });

  return router;
}

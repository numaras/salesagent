import { type Request, type Response, Router } from "express";
import { and, eq } from "drizzle-orm";
import { resolveFromHeaders, toToolContext } from "../../core/auth/authService.js";
import { NotFoundError, TenantError, toHttpError, ValidationError } from "../../core/errors.js";
import { headersFromNodeRequest } from "../../core/httpHeaders.js";
import { getDb } from "../../db/client.js";
import { listPublisherPartnersByTenant } from "../../db/repositories/authorized-property.js";
import { publisherPartners } from "../../db/schema.js";
import { discoverProperties } from "../../services/PropertyDiscoveryService.js";

function paramStr(v: string | string[] | undefined): string | undefined {
  return typeof v === "string" ? v : v?.[0];
}

export function createPublisherPartnersRouter(): Router {
  const router = Router();

  router.get("/publisher-partners", async (req: Request, res: Response) => {
    try {
      const headers = headersFromNodeRequest(req);
      const result = await resolveFromHeaders(headers);
      const ctx = toToolContext(result);
      if (!ctx?.tenantId) throw new TenantError();
      const db = getDb();

      const rows = await listPublisherPartnersByTenant(db, ctx.tenantId);
      res.json({
        publisher_partners: rows.map((r) => ({
          id: r.id,
          publisher_domain: r.publisherDomain,
          display_name: r.displayName,
          is_verified: r.isVerified,
          sync_status: r.syncStatus,
          last_synced_at: r.lastSyncedAt,
          created_at: r.createdAt,
        })),
      });
    } catch (err) {
      const { status, body } = toHttpError(err);
      res.status(status).json(body);
    }
  });

  router.post("/publisher-partners", async (req: Request, res: Response) => {
    try {
      const headers = headersFromNodeRequest(req);
      const result = await resolveFromHeaders(headers);
      const ctx = toToolContext(result);
      if (!ctx?.tenantId) throw new TenantError();
      const db = getDb();

      const body = req.body as Record<string, unknown>;
      if (!body.publisher_domain || typeof body.publisher_domain !== "string") {
        throw new ValidationError("publisher_domain is required");
      }

      const inserted = await db
        .insert(publisherPartners)
        .values({
          tenantId: ctx.tenantId,
          publisherDomain: body.publisher_domain,
          displayName: (body.display_name as string) ?? null,
        })
        .returning();

      const row = inserted[0]!;
      res.status(201).json({ id: row.id, publisher_domain: row.publisherDomain });
    } catch (err) {
      const { status, body } = toHttpError(err);
      res.status(status).json(body);
    }
  });

  router.post("/publisher-partners/:id/sync", async (req: Request, res: Response) => {
    try {
      const headers = headersFromNodeRequest(req);
      const result = await resolveFromHeaders(headers);
      const ctx = toToolContext(result);
      if (!ctx?.tenantId) throw new TenantError();
      const id = Number(paramStr(req.params.id));
      if (!id || isNaN(id)) throw new NotFoundError("PublisherPartner", "undefined");

      const db = getDb();
      const existing = await db
        .select()
        .from(publisherPartners)
        .where(
          and(eq(publisherPartners.id, id), eq(publisherPartners.tenantId, ctx.tenantId))
        )
        .limit(1);
      if (existing.length === 0) throw new NotFoundError("PublisherPartner", String(id));

      const discoverResult = await discoverProperties(ctx.tenantId);
      
      await db
        .update(publisherPartners)
        .set({
          syncStatus: "success",
          lastSyncedAt: new Date()
        })
        .where(
          and(eq(publisherPartners.id, id), eq(publisherPartners.tenantId, ctx.tenantId))
        );

      res.json({ success: true, discovered: discoverResult.discovered });
    } catch (err) {
      const { status, body } = toHttpError(err);
      res.status(status).json(body);
    }
  });

  router.delete("/publisher-partners/:id", async (req: Request, res: Response) => {
    try {
      const headers = headersFromNodeRequest(req);
      const result = await resolveFromHeaders(headers);
      const ctx = toToolContext(result);
      if (!ctx?.tenantId) throw new TenantError();
      const db = getDb();
      const id = Number(paramStr(req.params.id));
      if (!id || isNaN(id)) throw new NotFoundError("PublisherPartner", "undefined");

      const existing = await db
        .select()
        .from(publisherPartners)
        .where(
          and(eq(publisherPartners.id, id), eq(publisherPartners.tenantId, ctx.tenantId))
        )
        .limit(1);
      if (existing.length === 0) throw new NotFoundError("PublisherPartner", String(id));

      await db
        .delete(publisherPartners)
        .where(
          and(eq(publisherPartners.id, id), eq(publisherPartners.tenantId, ctx.tenantId))
        );

      res.json({ success: true, id });
    } catch (err) {
      const { status, body } = toHttpError(err);
      res.status(status).json(body);
    }
  });

  return router;
}

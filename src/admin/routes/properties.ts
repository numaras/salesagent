import { type Request, type Response, Router } from "express";
import { and, eq } from "drizzle-orm";
import { resolveFromHeaders, toToolContext } from "../../core/auth/authService.js";
import { NotFoundError, TenantError, toHttpError, ValidationError } from "../../core/errors.js";
import { headersFromNodeRequest } from "../../core/httpHeaders.js";
import { getDb } from "../../db/client.js";
import { listPropertiesByTenant } from "../../db/repositories/authorized-property.js";
import { authorizedProperties } from "../../db/schema.js";
import { verifyProperty } from "../../services/PropertyVerificationService.js";

function paramStr(v: string | string[] | undefined): string | undefined {
  return typeof v === "string" ? v : v?.[0];
}

export function createPropertiesRouter(): Router {
  const router = Router();

  router.get("/properties", async (req: Request, res: Response) => {
    try {
      const headers = headersFromNodeRequest(req);
      const result = await resolveFromHeaders(headers);
      const ctx = toToolContext(result);
      if (!ctx?.tenantId) throw new TenantError();
      const db = getDb();

      const rows = await listPropertiesByTenant(db, ctx.tenantId);
      res.json({
        properties: rows.map((r) => ({
          property_id: r.propertyId,
          name: r.name,
          property_type: r.propertyType,
          publisher_domain: r.publisherDomain,
          verification_status: r.verificationStatus,
          tags: r.tags,
          created_at: r.createdAt,
        })),
      });
    } catch (err) {
      const { status, body } = toHttpError(err);
      res.status(status).json(body);
    }
  });

  router.post("/properties", async (req: Request, res: Response) => {
    try {
      const headers = headersFromNodeRequest(req);
      const result = await resolveFromHeaders(headers);
      const ctx = toToolContext(result);
      if (!ctx?.tenantId) throw new TenantError();
      const db = getDb();

      const body = req.body as Record<string, unknown>;
      if (!body.property_id || !body.name || !body.property_type || !body.publisher_domain) {
        throw new ValidationError("property_id, name, property_type, and publisher_domain are required");
      }

      const inserted = await db
        .insert(authorizedProperties)
        .values({
          tenantId: ctx.tenantId,
          propertyId: body.property_id as string,
          name: body.name as string,
          propertyType: body.property_type as string,
          publisherDomain: body.publisher_domain as string,
          identifiers: (body.identifiers as unknown) ?? {},
          tags: (body.tags as unknown) ?? null,
        })
        .returning();

      const row = inserted[0]!;
      res.status(201).json({ property_id: row.propertyId, name: row.name });
    } catch (err) {
      const { status, body } = toHttpError(err);
      res.status(status).json(body);
    }
  });

  router.post("/properties/:id/verify", async (req: Request, res: Response) => {
    try {
      const headers = headersFromNodeRequest(req);
      const result = await resolveFromHeaders(headers);
      const ctx = toToolContext(result);
      if (!ctx?.tenantId) throw new TenantError();
      const id = paramStr(req.params.id);
      if (!id) throw new NotFoundError("Property", "undefined");

      await verifyProperty(id, ctx.tenantId);
      res.json({ success: true });
    } catch (err) {
      const { status, body } = toHttpError(err);
      res.status(status).json(body);
    }
  });

  router.delete("/properties/:propertyId", async (req: Request, res: Response) => {
    try {
      const headers = headersFromNodeRequest(req);
      const result = await resolveFromHeaders(headers);
      const ctx = toToolContext(result);
      if (!ctx?.tenantId) throw new TenantError();
      const db = getDb();
      const propertyId = paramStr(req.params.propertyId);
      if (!propertyId) throw new NotFoundError("Property", "undefined");

      const existing = await db
        .select()
        .from(authorizedProperties)
        .where(
          and(
            eq(authorizedProperties.tenantId, ctx.tenantId),
            eq(authorizedProperties.propertyId, propertyId),
          )
        )
        .limit(1);
      if (existing.length === 0) throw new NotFoundError("Property", propertyId);

      await db
        .delete(authorizedProperties)
        .where(
          and(
            eq(authorizedProperties.tenantId, ctx.tenantId),
            eq(authorizedProperties.propertyId, propertyId),
          )
        );

      res.json({ success: true, property_id: propertyId });
    } catch (err) {
      const { status, body } = toHttpError(err);
      res.status(status).json(body);
    }
  });

  return router;
}

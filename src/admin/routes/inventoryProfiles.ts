import { type Request, type Response, Router } from "express";
import { eq, and } from "drizzle-orm";
import { resolveFromHeaders, toToolContext } from "../../core/auth/authService.js";
import { TenantError, toHttpError } from "../../core/errors.js";
import { headersFromNodeRequest } from "../../core/httpHeaders.js";
import { getDb } from "../../db/client.js";
import { inventoryProfiles } from "../../db/schema.js";

export function createInventoryProfilesRouter(): Router {
  const router = Router();

  router.get("/inventory-profiles", async (req: Request, res: Response): Promise<void> => {
    try {
      const headers = headersFromNodeRequest(req);
      const result = await resolveFromHeaders(headers);
      const ctx = toToolContext(result);
      if (!ctx?.tenantId) throw new TenantError();

      const db = getDb();
      const rows = await db
        .select()
        .from(inventoryProfiles)
        .where(eq(inventoryProfiles.tenantId, ctx.tenantId));

      res.json({ inventory_profiles: rows });
    } catch (err) {
      const { status, body } = toHttpError(err);
      res.status(status).json(body);
    }
  });

  router.get("/inventory-profiles/:id", async (req: Request, res: Response): Promise<void> => {
    try {
      const headers = headersFromNodeRequest(req);
      const result = await resolveFromHeaders(headers);
      const ctx = toToolContext(result);
      if (!ctx?.tenantId) throw new TenantError();

      const db = getDb();
      const rows = await db
        .select()
        .from(inventoryProfiles)
        .where(
          and(
            eq(inventoryProfiles.tenantId, ctx.tenantId),
            eq(inventoryProfiles.id, parseInt(req.params.id as string))
          )
        );

      if (rows.length === 0) {
        res.status(404).json({ error: "Not found" });
        return;
      }

      res.json(rows[0]);
    } catch (err) {
      const { status, body } = toHttpError(err);
      res.status(status).json(body);
    }
  });

  router.post("/inventory-profiles", async (req: Request, res: Response): Promise<void> => {
    try {
      const headers = headersFromNodeRequest(req);
      const result = await resolveFromHeaders(headers);
      const ctx = toToolContext(result);
      if (!ctx?.tenantId) throw new TenantError();

      const db = getDb();
      const {
        profile_id,
        name,
        description,
        inventory_config,
        format_ids,
        publisher_properties,
      } = req.body;

      const [newProfile] = await db
        .insert(inventoryProfiles)
        .values({
          tenantId: ctx.tenantId,
          profileId: profile_id,
          name,
          description: description || null,
          inventoryConfig: typeof inventory_config === "string" ? JSON.parse(inventory_config) : inventory_config,
          formatIds: Array.isArray(format_ids)
            ? format_ids
            : format_ids?.split(",").map((s: string) => s.trim()) || [],
          publisherProperties: typeof publisher_properties === "string" ? JSON.parse(publisher_properties) : publisher_properties,
        })
        .returning();

      res.json(newProfile);
    } catch (err) {
      const { status, body } = toHttpError(err);
      res.status(status).json(body);
    }
  });

  router.put("/inventory-profiles/:id", async (req: Request, res: Response): Promise<void> => {
    try {
      const headers = headersFromNodeRequest(req);
      const result = await resolveFromHeaders(headers);
      const ctx = toToolContext(result);
      if (!ctx?.tenantId) throw new TenantError();

      const db = getDb();
      const {
        profile_id,
        name,
        description,
        inventory_config,
        format_ids,
        publisher_properties,
      } = req.body;

      const [updatedProfile] = await db
        .update(inventoryProfiles)
        .set({
          profileId: profile_id,
          name,
          description: description || null,
          inventoryConfig: typeof inventory_config === "string" ? JSON.parse(inventory_config) : inventory_config,
          formatIds: Array.isArray(format_ids)
            ? format_ids
            : format_ids?.split(",").map((s: string) => s.trim()) || [],
          publisherProperties: typeof publisher_properties === "string" ? JSON.parse(publisher_properties) : publisher_properties,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(inventoryProfiles.tenantId, ctx.tenantId),
            eq(inventoryProfiles.id, parseInt(req.params.id as string))
          )
        )
        .returning();

      if (!updatedProfile) {
        res.status(404).json({ error: "Not found" });
        return;
      }

      res.json(updatedProfile);
    } catch (err) {
      const { status, body } = toHttpError(err);
      res.status(status).json(body);
    }
  });

  router.delete("/inventory-profiles/:id", async (req: Request, res: Response): Promise<void> => {
    try {
      const headers = headersFromNodeRequest(req);
      const result = await resolveFromHeaders(headers);
      const ctx = toToolContext(result);
      if (!ctx?.tenantId) throw new TenantError();

      const db = getDb();
      const deletedRows = await db
        .delete(inventoryProfiles)
        .where(
          and(
            eq(inventoryProfiles.tenantId, ctx.tenantId),
            eq(inventoryProfiles.id, parseInt(req.params.id as string))
          )
        )
        .returning();

      if (deletedRows.length === 0) {
        res.status(404).json({ error: "Not found" });
        return;
      }

      res.json({ success: true });
    } catch (err) {
      const { status, body } = toHttpError(err);
      res.status(status).json(body);
    }
  });

  return router;
}

import { type Request, type Response, Router } from "express";
import { eq } from "drizzle-orm";
import { resolveFromHeaders, toToolContext } from "../../core/auth/authService.js";
import { TenantError, toHttpError } from "../../core/errors.js";
import { headersFromNodeRequest } from "../../core/httpHeaders.js";
import { getDb } from "../../db/client.js";
import { gamInventory } from "../../db/schema.js";

export function createInventoryRouter(): Router {
  const router = Router();

  router.get("/inventory", async (req: Request, res: Response) => {
    try {
      const headers = headersFromNodeRequest(req);
      const result = await resolveFromHeaders(headers);
      const ctx = toToolContext(result);
      if (!ctx?.tenantId) throw new TenantError();
      const db = getDb();

      const rows = await db
        .select()
        .from(gamInventory)
        .where(eq(gamInventory.tenantId, ctx.tenantId));

      res.json({
        inventory: rows.map((r) => ({
          id: r.id,
          inventory_type: r.inventoryType,
          inventory_id: r.inventoryId,
          name: r.name,
          path: r.path,
          status: r.status,
          inventory_metadata: r.inventoryMetadata,
          last_synced: r.lastSynced,
        })),
      });
    } catch (err) {
      const { status, body } = toHttpError(err);
      res.status(status).json(body);
    }
  });

  router.get("/inventory/tree", async (req: Request, res: Response) => {
    try {
      const headers = headersFromNodeRequest(req);
      const result = await resolveFromHeaders(headers);
      const ctx = toToolContext(result);
      if (!ctx?.tenantId) throw new TenantError();
      const db = getDb();

      const rows = await db
        .select()
        .from(gamInventory)
        .where(eq(gamInventory.tenantId, ctx.tenantId));

      const grouped = rows.reduce((acc, row) => {
        const type = row.inventoryType || "unknown";
        if (!acc[type]) {
          acc[type] = { id: `type-${type}`, name: type, children: [] };
        }
        acc[type].children.push({
          id: row.id.toString(),
          inventory_id: row.inventoryId,
          name: row.name,
          path: row.path,
          status: row.status,
          inventory_metadata: row.inventoryMetadata,
        });
        return acc;
      }, {} as Record<string, any>);

      res.json({ tree: Object.values(grouped) });
    } catch (err) {
      const { status, body } = toHttpError(err);
      res.status(status).json(body);
    }
  });

  router.get("/inventory/targeting-keys", async (req: Request, res: Response) => {
    try {
      const headers = headersFromNodeRequest(req);
      const result = await resolveFromHeaders(headers);
      const ctx = toToolContext(result);
      if (!ctx?.tenantId) throw new TenantError();

      res.json({
        keys: [
          { id: "1", name: "axe_segment", type: "custom" }
        ]
      });
    } catch (err) {
      const { status, body } = toHttpError(err);
      res.status(status).json(body);
    }
  });

  router.post("/inventory/sync", async (req: Request, res: Response) => {
    try {
      const headers = headersFromNodeRequest(req);
      const result = await resolveFromHeaders(headers);
      const ctx = toToolContext(result);
      if (!ctx?.tenantId) throw new TenantError();

      res.json({ success: true, message: "Inventory sync not yet implemented" });
    } catch (err) {
      const { status, body } = toHttpError(err);
      res.status(status).json(body);
    }
  });

  return router;
}

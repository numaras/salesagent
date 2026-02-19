import { type Request, type Response, Router } from "express";
import { eq } from "drizzle-orm";
import { resolveFromHeaders, toToolContext } from "../../core/auth/authService.js";
import { TenantError, toHttpError } from "../../core/errors.js";
import { headersFromNodeRequest } from "../../core/httpHeaders.js";
import { getDb } from "../../db/client.js";
import { listMediaBuysByTenant } from "../../db/repositories/media-buy.js";
import { webhookDeliveries } from "../../db/schema.js";

export function createOperationsRouter(): Router {
  const router = Router();

  router.get("/operations/media-buys", async (req: Request, res: Response) => {
    try {
      const headers = headersFromNodeRequest(req);
      const result = await resolveFromHeaders(headers);
      const ctx = toToolContext(result);
      if (!ctx?.tenantId) throw new TenantError();
      const db = getDb();

      const rows = await listMediaBuysByTenant(db, ctx.tenantId);
      res.json({
        media_buys: rows.map((r) => ({
          media_buy_id: r.mediaBuyId,
          order_name: r.orderName,
          advertiser_name: r.advertiserName,
          status: r.status,
          budget: r.budget,
          currency: r.currency,
          start_date: r.startDate,
          end_date: r.endDate,
          created_at: r.createdAt,
        })),
      });
    } catch (err) {
      const { status, body } = toHttpError(err);
      res.status(status).json(body);
    }
  });

  router.get("/operations/webhooks", async (req: Request, res: Response) => {
    try {
      const headers = headersFromNodeRequest(req);
      const result = await resolveFromHeaders(headers);
      const ctx = toToolContext(result);
      if (!ctx?.tenantId) throw new TenantError();
      const db = getDb();

      const rows = await db
        .select()
        .from(webhookDeliveries)
        .where(eq(webhookDeliveries.tenantId, ctx.tenantId));

      res.json({
        webhooks: rows.map((r) => ({
          delivery_id: r.deliveryId,
          webhook_url: r.webhookUrl,
          event_type: r.eventType,
          object_id: r.objectId,
          status: r.status,
          attempts: r.attempts,
          last_attempt_at: r.lastAttemptAt,
          delivered_at: r.deliveredAt,
          last_error: r.lastError,
          response_code: r.responseCode,
          created_at: r.createdAt,
        })),
      });
    } catch (err) {
      const { status, body } = toHttpError(err);
      res.status(status).json(body);
    }
  });

  return router;
}

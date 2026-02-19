import { type Request, type Response, Router } from "express";
import { resolveFromHeaders, toToolContext } from "../../core/auth/authService.js";
import { NotFoundError, TenantError, toHttpError, ValidationError } from "../../core/errors.js";
import { headersFromNodeRequest } from "../../core/httpHeaders.js";
import { getDb } from "../../db/client.js";
import {
  listMediaBuysByTenant,
  getMediaBuyById,
  listPackagesByMediaBuy,
} from "../../db/repositories/media-buy.js";
import {
  listObjectMappingsByObject,
} from "../../db/repositories/workflow-step.js";
import { approveOrder, rejectOrder } from "../../services/OrderApprovalService.js";

function paramStr(v: string | string[] | undefined): string | undefined {
  return typeof v === "string" ? v : v?.[0];
}

export function createMediaBuysRouter(): Router {
  const router = Router();

  router.get("/media-buys", async (req: Request, res: Response) => {
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

  router.get("/media-buys/:mediaBuyId", async (req: Request, res: Response) => {
    try {
      const headers = headersFromNodeRequest(req);
      const result = await resolveFromHeaders(headers);
      const ctx = toToolContext(result);
      if (!ctx?.tenantId) throw new TenantError();
      const db = getDb();
      const mediaBuyId = paramStr(req.params.mediaBuyId);
      if (!mediaBuyId) throw new NotFoundError("MediaBuy", "undefined");

      const row = await getMediaBuyById(db, mediaBuyId);
      if (!row || row.tenantId !== ctx.tenantId) {
        throw new NotFoundError("MediaBuy", mediaBuyId);
      }

      const packages = await listPackagesByMediaBuy(db, mediaBuyId);
      const workflowMappings = await listObjectMappingsByObject(db, "media_buy", mediaBuyId);

      res.json({
        media_buy_id: row.mediaBuyId,
        order_name: row.orderName,
        advertiser_name: row.advertiserName,
        status: row.status,
        budget: row.budget,
        currency: row.currency,
        start_date: row.startDate,
        end_date: row.endDate,
        principal_id: row.principalId,
        buyer_ref: row.buyerRef,
        created_at: row.createdAt,
        updated_at: row.updatedAt,
        packages: packages.map((p) => ({
          package_id: p.packageId,
          budget: p.budget,
          package_config: p.packageConfig,
        })),
        workflow_mappings: workflowMappings.map((m) => ({
          step_id: m.stepId,
          action: m.action,
          created_at: m.createdAt,
        })),
      });
    } catch (err) {
      const { status, body } = toHttpError(err);
      res.status(status).json(body);
    }
  });

  router.post("/media-buys/:mediaBuyId/approve", async (req: Request, res: Response) => {
    try {
      const mediaBuyId = paramStr(req.params.mediaBuyId);
      if (!mediaBuyId) throw new NotFoundError("MediaBuy", "undefined");
      const { step_id } = req.body as { step_id?: string };
      if (!step_id) throw new ValidationError("step_id is required");

      const step = await approveOrder(step_id);
      res.json({ success: true, step_id: step.stepId, status: step.status });
    } catch (err) {
      const { status, body } = toHttpError(err);
      res.status(status).json(body);
    }
  });

  router.post("/media-buys/:mediaBuyId/reject", async (req: Request, res: Response) => {
    try {
      const mediaBuyId = paramStr(req.params.mediaBuyId);
      if (!mediaBuyId) throw new NotFoundError("MediaBuy", "undefined");
      const { step_id, reason } = req.body as { step_id?: string; reason?: string };
      if (!step_id) throw new ValidationError("step_id is required");

      const step = await rejectOrder(step_id, reason ?? "Rejected by admin");
      res.json({ success: true, step_id: step.stepId, status: step.status });
    } catch (err) {
      const { status, body } = toHttpError(err);
      res.status(status).json(body);
    }
  });

  return router;
}

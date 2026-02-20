import { type Request, type Response, Router } from "express";
import { resolveFromHeaders, toToolContext } from "../../core/auth/authService.js";
import { TenantError, toHttpError } from "../../core/errors.js";
import { headersFromNodeRequest } from "../../core/httpHeaders.js";
import { getDb } from "../../db/client.js";
import { auditLogs } from "../../db/schema.js";
import { eq, desc, gt, and } from "drizzle-orm";

export function createActivityStreamRouter(): Router {
  const router = Router();

  router.get("/activity/stream", async (req: Request, res: Response) => {
    try {
      const headers = headersFromNodeRequest(req);
      const result = await resolveFromHeaders(headers);
      const ctx = toToolContext(result);
      if (!ctx?.tenantId) {
        throw new TenantError();
      }

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      // Send initial connection heartbeat
      res.write("data: {\"type\":\"connected\"}\n\n");

      const db = getDb();
      let lastId = 0;

      // Get the latest 20 logs first
      const initialLogs = await db.select()
        .from(auditLogs)
        .where(eq(auditLogs.tenantId, ctx.tenantId))
        .orderBy(desc(auditLogs.logId))
        .limit(20);

      if (initialLogs.length > 0) {
        lastId = initialLogs[0].logId;
        // Send initial logs in reverse (oldest first)
        for (const log of [...initialLogs].reverse()) {
          res.write(`data: ${JSON.stringify({ type: "activity", data: log })}\n\n`);
        }
      }

      const pollInterval = setInterval(async () => {
        try {
          const newLogs = await db.select()
            .from(auditLogs)
            .where(
              and(
                eq(auditLogs.tenantId, ctx.tenantId),
                gt(auditLogs.logId, lastId)
              )
            )
            .orderBy(auditLogs.logId);

          if (newLogs.length > 0) {
            lastId = newLogs[newLogs.length - 1].logId;
            for (const log of newLogs) {
              res.write(`data: ${JSON.stringify({ type: "activity", data: log })}\n\n`);
            }
          }
        } catch {
          // Ignore polling errors
        }
      }, 2000);

      req.on("close", () => {
        clearInterval(pollInterval);
      });
    } catch (err) {
      const { status, body } = toHttpError(err);
      res.status(status).json(body);
    }
  });

  return router;
}

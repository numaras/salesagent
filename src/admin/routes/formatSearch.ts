import { type Request, type Response, Router } from "express";
import { resolveFromHeaders, toToolContext } from "../../core/auth/authService.js";
import { TenantError, toHttpError } from "../../core/errors.js";
import { headersFromNodeRequest } from "../../core/httpHeaders.js";
import { getDb } from "../../db/client.js";
import { listCreativeAgentsByTenant } from "../../db/repositories/creative-agent.js";

export function createFormatSearchRouter(): Router {
  const router = Router();

  const handleFormats = async (req: Request, res: Response) => {
    try {
      const headers = headersFromNodeRequest(req);
      const result = await resolveFromHeaders(headers);
      const ctx = toToolContext(result);
      if (!ctx?.tenantId) throw new TenantError();

      const db = getDb();
      const agents = await listCreativeAgentsByTenant(db, ctx.tenantId);

      res.json({
        formats: [],
        agents: agents.map((a) => a.agentUrl),
      });
    } catch (err) {
      const { status, body } = toHttpError(err);
      res.status(status).json(body);
    }
  };

  router.get("/formats/search", handleFormats);
  router.get("/formats/list", handleFormats);
  router.get("/formats/templates", handleFormats);
  router.get("/formats/agents", handleFormats);

  return router;
}

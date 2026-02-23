import { type Request, type Response, Router } from "express";
import { and, eq } from "drizzle-orm";
import { resolveFromHeaders, toToolContext } from "../../core/auth/authService.js";
import { NotFoundError, TenantError, toHttpError, ValidationError } from "../../core/errors.js";
import { headersFromNodeRequest } from "../../core/httpHeaders.js";
import { encryptForStorage } from "../../core/security/encryption.js";
import { getDb } from "../../db/client.js";
import { signalsAgents } from "../../db/schema.js";

function paramStr(v: string | string[] | undefined): string | undefined {
  return typeof v === "string" ? v : v?.[0];
}

export function createSignalsAgentsRouter(): Router {
  const router = Router();

  router.get("/signals-agents", async (req: Request, res: Response) => {
    try {
      const headers = headersFromNodeRequest(req);
      const result = await resolveFromHeaders(headers);
      const ctx = toToolContext(result);
      if (!ctx?.tenantId) throw new TenantError();
      const db = getDb();

      const rows = await db
        .select()
        .from(signalsAgents)
        .where(eq(signalsAgents.tenantId, ctx.tenantId));

      res.json({
        signals_agents: rows.map((r) => ({
          id: r.id,
          name: r.name,
          agent_url: r.agentUrl,
          enabled: r.enabled,
          timeout: r.timeout,
          auth_type: r.authType,
          auth_header: r.authHeader,
          forward_promoted_offering: r.forwardPromotedOffering,
          created_at: r.createdAt,
        })),
      });
    } catch (err) {
      const { status, body } = toHttpError(err);
      res.status(status).json(body);
    }
  });

  router.post("/signals-agents", async (req: Request, res: Response) => {
    try {
      const headers = headersFromNodeRequest(req);
      const result = await resolveFromHeaders(headers);
      const ctx = toToolContext(result);
      if (!ctx?.tenantId) throw new TenantError();
      const db = getDb();

      const body = req.body as Record<string, unknown>;
      if (!body.name || !body.agent_url) {
        throw new ValidationError("name and agent_url are required");
      }

      const inserted = await db
        .insert(signalsAgents)
        .values({
          tenantId: ctx.tenantId,
          name: body.name as string,
          agentUrl: body.agent_url as string,
          enabled: (body.enabled as boolean) ?? true,
          timeout: (body.timeout as number) ?? 30,
          authType: (body.auth_type as string) ?? null,
          authHeader: (body.auth_header as string) ?? null,
          authCredentials: (body.auth_credentials as string)
            ? encryptForStorage(body.auth_credentials as string)
            : null,
          forwardPromotedOffering: (body.forward_promoted_offering as boolean) ?? true,
        })
        .returning();

      const row = inserted[0]!;
      res.status(201).json({ id: row.id, name: row.name, agent_url: row.agentUrl });
    } catch (err) {
      const { status, body } = toHttpError(err);
      res.status(status).json(body);
    }
  });

  router.put("/signals-agents/:id", async (req: Request, res: Response) => {
    try {
      const headers = headersFromNodeRequest(req);
      const result = await resolveFromHeaders(headers);
      const ctx = toToolContext(result);
      if (!ctx?.tenantId) throw new TenantError();
      const db = getDb();
      const id = Number(paramStr(req.params.id));
      if (!id || isNaN(id)) throw new NotFoundError("SignalsAgent", "undefined");

      const existing = await db
        .select()
        .from(signalsAgents)
        .where(and(eq(signalsAgents.id, id), eq(signalsAgents.tenantId, ctx.tenantId)))
        .limit(1);
      if (existing.length === 0) throw new NotFoundError("SignalsAgent", String(id));
      const prev = existing[0]!;

      const body = req.body as Record<string, unknown>;
      const updated = await db
        .update(signalsAgents)
        .set({
          name: (body.name as string) ?? prev.name,
          agentUrl: (body.agent_url as string) ?? prev.agentUrl,
          enabled: (body.enabled as boolean) ?? prev.enabled,
          timeout: (body.timeout as number) ?? prev.timeout,
          authType: (body.auth_type as string) ?? prev.authType,
          authHeader: (body.auth_header as string) ?? prev.authHeader,
          authCredentials: (body.auth_credentials as string)
            ? encryptForStorage(body.auth_credentials as string)
            : prev.authCredentials,
          forwardPromotedOffering: (body.forward_promoted_offering as boolean) ?? prev.forwardPromotedOffering,
          updatedAt: new Date(),
        })
        .where(and(eq(signalsAgents.id, id), eq(signalsAgents.tenantId, ctx.tenantId)))
        .returning();

      const row = updated[0]!;
      res.json({ id: row.id, name: row.name, agent_url: row.agentUrl, enabled: row.enabled });
    } catch (err) {
      const { status, body } = toHttpError(err);
      res.status(status).json(body);
    }
  });

  router.delete("/signals-agents/:id", async (req: Request, res: Response) => {
    try {
      const headers = headersFromNodeRequest(req);
      const result = await resolveFromHeaders(headers);
      const ctx = toToolContext(result);
      if (!ctx?.tenantId) throw new TenantError();
      const db = getDb();
      const id = Number(paramStr(req.params.id));
      if (!id || isNaN(id)) throw new NotFoundError("SignalsAgent", "undefined");

      const existing = await db
        .select()
        .from(signalsAgents)
        .where(and(eq(signalsAgents.id, id), eq(signalsAgents.tenantId, ctx.tenantId)))
        .limit(1);
      if (existing.length === 0) throw new NotFoundError("SignalsAgent", String(id));

      await db
        .delete(signalsAgents)
        .where(and(eq(signalsAgents.id, id), eq(signalsAgents.tenantId, ctx.tenantId)));

      res.json({ success: true, id });
    } catch (err) {
      const { status, body } = toHttpError(err);
      res.status(status).json(body);
    }
  });

  return router;
}

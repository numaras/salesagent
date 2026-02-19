import { type Request, type Response, Router } from "express";
import { and, eq } from "drizzle-orm";
import { resolveFromHeaders, toToolContext } from "../../core/auth/authService.js";
import { NotFoundError, TenantError, toHttpError, ValidationError } from "../../core/errors.js";
import { headersFromNodeRequest } from "../../core/httpHeaders.js";
import { getDb } from "../../db/client.js";
import { creativeAgents } from "../../db/schema.js";

function paramStr(v: string | string[] | undefined): string | undefined {
  return typeof v === "string" ? v : v?.[0];
}

export function createCreativeAgentsRouter(): Router {
  const router = Router();

  router.get("/creative-agents", async (req: Request, res: Response) => {
    try {
      const headers = headersFromNodeRequest(req);
      const result = await resolveFromHeaders(headers);
      const ctx = toToolContext(result);
      if (!ctx?.tenantId) throw new TenantError();
      const db = getDb();

      const rows = await db
        .select()
        .from(creativeAgents)
        .where(eq(creativeAgents.tenantId, ctx.tenantId));

      res.json({
        creative_agents: rows.map((r) => ({
          id: r.id,
          name: r.name,
          agent_url: r.agentUrl,
          enabled: r.enabled,
          priority: r.priority,
          timeout: r.timeout,
          auth_type: r.authType,
          created_at: r.createdAt,
        })),
      });
    } catch (err) {
      const { status, body } = toHttpError(err);
      res.status(status).json(body);
    }
  });

  router.post("/creative-agents", async (req: Request, res: Response) => {
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
        .insert(creativeAgents)
        .values({
          tenantId: ctx.tenantId,
          name: body.name as string,
          agentUrl: body.agent_url as string,
          enabled: (body.enabled as boolean) ?? true,
          priority: (body.priority as number) ?? 10,
          timeout: (body.timeout as number) ?? 30,
          authType: (body.auth_type as string) ?? null,
          authHeader: (body.auth_header as string) ?? null,
          authCredentials: (body.auth_credentials as string) ?? null,
        })
        .returning();

      const row = inserted[0]!;
      res.status(201).json({ id: row.id, name: row.name, agent_url: row.agentUrl });
    } catch (err) {
      const { status, body } = toHttpError(err);
      res.status(status).json(body);
    }
  });

  router.put("/creative-agents/:id", async (req: Request, res: Response) => {
    try {
      const headers = headersFromNodeRequest(req);
      const result = await resolveFromHeaders(headers);
      const ctx = toToolContext(result);
      if (!ctx?.tenantId) throw new TenantError();
      const db = getDb();
      const id = Number(paramStr(req.params.id));
      if (!id || isNaN(id)) throw new NotFoundError("CreativeAgent", "undefined");

      const existing = await db
        .select()
        .from(creativeAgents)
        .where(and(eq(creativeAgents.id, id), eq(creativeAgents.tenantId, ctx.tenantId)))
        .limit(1);
      if (existing.length === 0) throw new NotFoundError("CreativeAgent", String(id));
      const prev = existing[0]!;

      const body = req.body as Record<string, unknown>;
      const updated = await db
        .update(creativeAgents)
        .set({
          name: (body.name as string) ?? prev.name,
          agentUrl: (body.agent_url as string) ?? prev.agentUrl,
          enabled: (body.enabled as boolean) ?? prev.enabled,
          priority: (body.priority as number) ?? prev.priority,
          timeout: (body.timeout as number) ?? prev.timeout,
          authType: (body.auth_type as string) ?? prev.authType,
          authHeader: (body.auth_header as string) ?? prev.authHeader,
          authCredentials: (body.auth_credentials as string) ?? prev.authCredentials,
          updatedAt: new Date(),
        })
        .where(and(eq(creativeAgents.id, id), eq(creativeAgents.tenantId, ctx.tenantId)))
        .returning();

      const row = updated[0]!;
      res.json({ id: row.id, name: row.name, agent_url: row.agentUrl, enabled: row.enabled });
    } catch (err) {
      const { status, body } = toHttpError(err);
      res.status(status).json(body);
    }
  });

  router.delete("/creative-agents/:id", async (req: Request, res: Response) => {
    try {
      const headers = headersFromNodeRequest(req);
      const result = await resolveFromHeaders(headers);
      const ctx = toToolContext(result);
      if (!ctx?.tenantId) throw new TenantError();
      const db = getDb();
      const id = Number(paramStr(req.params.id));
      if (!id || isNaN(id)) throw new NotFoundError("CreativeAgent", "undefined");

      const existing = await db
        .select()
        .from(creativeAgents)
        .where(and(eq(creativeAgents.id, id), eq(creativeAgents.tenantId, ctx.tenantId)))
        .limit(1);
      if (existing.length === 0) throw new NotFoundError("CreativeAgent", String(id));

      await db
        .delete(creativeAgents)
        .where(and(eq(creativeAgents.id, id), eq(creativeAgents.tenantId, ctx.tenantId)));

      res.json({ success: true, id });
    } catch (err) {
      const { status, body } = toHttpError(err);
      res.status(status).json(body);
    }
  });

  return router;
}

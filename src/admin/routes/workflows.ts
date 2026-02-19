import { type Request, type Response, Router } from "express";
import { resolveFromHeaders, toToolContext } from "../../core/auth/authService.js";
import { NotFoundError, TenantError, toHttpError } from "../../core/errors.js";
import { headersFromNodeRequest } from "../../core/httpHeaders.js";
import { getDb } from "../../db/client.js";
import { workflowSteps, contexts } from "../../db/schema.js";
import { eq, and } from "drizzle-orm";
import {
  getWorkflowStepById,
} from "../../db/repositories/workflow-step.js";
import { approveOrder, rejectOrder } from "../../services/OrderApprovalService.js";

function paramStr(v: string | string[] | undefined): string | undefined {
  return typeof v === "string" ? v : v?.[0];
}

export function createWorkflowsRouter(): Router {
  const router = Router();

  router.get("/workflows", async (req: Request, res: Response) => {
    try {
      const headers = headersFromNodeRequest(req);
      const result = await resolveFromHeaders(headers);
      const ctx = toToolContext(result);
      if (!ctx?.tenantId) throw new TenantError();
      const db = getDb();

      const tenantContexts = await db
        .select({ contextId: contexts.contextId })
        .from(contexts)
        .where(eq(contexts.tenantId, ctx.tenantId));

      const contextIds = tenantContexts.map((c) => c.contextId);
      if (contextIds.length === 0) {
        res.json({ workflows: [] });
        return;
      }

      const allSteps = [];
      for (const cid of contextIds) {
        const steps = await db
          .select()
          .from(workflowSteps)
          .where(eq(workflowSteps.contextId, cid));
        allSteps.push(...steps);
      }

      res.json({
        workflows: allSteps.map((s) => ({
          step_id: s.stepId,
          context_id: s.contextId,
          step_type: s.stepType,
          tool_name: s.toolName,
          status: s.status,
          owner: s.owner,
          assigned_to: s.assignedTo,
          created_at: s.createdAt,
          completed_at: s.completedAt,
        })),
      });
    } catch (err) {
      const { status, body } = toHttpError(err);
      res.status(status).json(body);
    }
  });

  router.get("/workflows/:stepId", async (req: Request, res: Response) => {
    try {
      const headers = headersFromNodeRequest(req);
      const result = await resolveFromHeaders(headers);
      const ctx = toToolContext(result);
      if (!ctx?.tenantId) throw new TenantError();
      const db = getDb();
      const stepId = paramStr(req.params.stepId);
      if (!stepId) throw new NotFoundError("WorkflowStep", "undefined");

      const step = await getWorkflowStepById(db, stepId);
      if (!step) throw new NotFoundError("WorkflowStep", stepId);

      const ctxRow = await db
        .select()
        .from(contexts)
        .where(and(eq(contexts.contextId, step.contextId), eq(contexts.tenantId, ctx.tenantId)))
        .limit(1);
      if (ctxRow.length === 0) throw new NotFoundError("WorkflowStep", stepId);

      res.json({
        step_id: step.stepId,
        context_id: step.contextId,
        step_type: step.stepType,
        tool_name: step.toolName,
        request_data: step.requestData,
        response_data: step.responseData,
        status: step.status,
        owner: step.owner,
        assigned_to: step.assignedTo,
        created_at: step.createdAt,
        completed_at: step.completedAt,
        error_message: step.errorMessage,
      });
    } catch (err) {
      const { status, body } = toHttpError(err);
      res.status(status).json(body);
    }
  });

  router.post("/workflows/:stepId/approve", async (req: Request, res: Response) => {
    try {
      const stepId = paramStr(req.params.stepId);
      if (!stepId) throw new NotFoundError("WorkflowStep", "undefined");

      const step = await approveOrder(stepId);
      res.json({ success: true, step_id: step.stepId, status: step.status });
    } catch (err) {
      const { status, body } = toHttpError(err);
      res.status(status).json(body);
    }
  });

  router.post("/workflows/:stepId/reject", async (req: Request, res: Response) => {
    try {
      const stepId = paramStr(req.params.stepId);
      if (!stepId) throw new NotFoundError("WorkflowStep", "undefined");
      const { reason } = req.body as { reason?: string };

      const step = await rejectOrder(stepId, reason ?? "Rejected by admin");
      res.json({ success: true, step_id: step.stepId, status: step.status });
    } catch (err) {
      const { status, body } = toHttpError(err);
      res.status(status).json(body);
    }
  });

  return router;
}

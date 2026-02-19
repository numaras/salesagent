/**
 * Order approval workflow: request, approve, and reject media buy orders.
 */

import { eq } from "drizzle-orm";
import { getDb } from "../db/client.js";
import {
  insertWorkflowStep,
  insertObjectWorkflowMapping,
  updateWorkflowStepStatus,
  getWorkflowStepById,
} from "../db/repositories/workflow-step.js";
import type { WorkflowStepRow } from "../db/repositories/workflow-step.js";
import type { ToolContext } from "../core/auth/types.js";
import { NotFoundError, ValidationError } from "../core/errors.js";
import { workflowSteps } from "../db/schema.js";

export async function requestApproval(
  ctx: ToolContext,
  mediaBuyId: string,
  stepId: string
): Promise<WorkflowStepRow> {
  if (!ctx.principalId) {
    throw new ValidationError("Principal context required for approval requests");
  }

  const db = getDb();

  const step = await insertWorkflowStep(db, {
    stepId,
    contextId: ctx.tenantId,
    stepType: "approval",
    toolName: "create_media_buy",
    status: "requires_approval",
    owner: "human",
    assignedTo: null,
    requestData: { mediaBuyId, principalId: ctx.principalId },
  });

  await insertObjectWorkflowMapping(db, {
    objectType: "media_buy",
    objectId: mediaBuyId,
    stepId,
    action: "approval_requested",
  });

  return step;
}

export async function approveOrder(
  stepId: string
): Promise<WorkflowStepRow> {
  const db = getDb();
  const step = await getWorkflowStepById(db, stepId);
  if (!step) throw new NotFoundError("WorkflowStep", stepId);

  const updated = await updateWorkflowStepStatus(db, stepId, "completed", new Date());
  if (!updated) throw new NotFoundError("WorkflowStep", stepId);
  return updated;
}

export async function rejectOrder(
  stepId: string,
  reason: string
): Promise<WorkflowStepRow> {
  const db = getDb();
  const step = await getWorkflowStepById(db, stepId);
  if (!step) throw new NotFoundError("WorkflowStep", stepId);

  const updated = await db
    .update(workflowSteps)
    .set({ status: "failed", errorMessage: reason, completedAt: new Date() })
    .where(eq(workflowSteps.stepId, stepId))
    .returning();

  if (!updated[0]) throw new NotFoundError("WorkflowStep", stepId);
  return updated[0];
}

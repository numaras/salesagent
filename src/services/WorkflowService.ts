/**
 * Workflow application service: list tasks, get task, complete task.
 * Uses workflow_steps and object_workflow_mapping repositories.
 */

import { getDb } from "../db/client.js";
import {
  getWorkflowStepById,
  listWorkflowStepsByContext,
  listWorkflowStepsByStatus,
  updateWorkflowStepStatus,
} from "../db/repositories/workflow-step.js";
import { listContextsByTenantAndPrincipal } from "../db/repositories/context.js";
import type { ToolContext } from "../core/auth/types.js";

export interface TaskItem {
  task_id: string;
  context_id: string;
  step_type: string;
  tool_name: string | null;
  status: string;
  owner: string;
  created_at: string | null;
  [key: string]: unknown;
}

export async function listTasks(
  ctx: ToolContext,
  status?: string
): Promise<{ tasks: TaskItem[] }> {
  const db = getDb();
  const contexts = await listContextsByTenantAndPrincipal(
    db,
    ctx.tenantId,
    ctx.principalId ?? ""
  );
  const contextIds = new Set(contexts.map((c) => c.contextId));
  let stepList: Awaited<ReturnType<typeof listWorkflowStepsByContext>>;
  if (status) {
    const byStatus = await listWorkflowStepsByStatus(db, status);
    stepList = byStatus.filter((s) => contextIds.has(s.contextId));
  } else {
    stepList = [];
    for (const c of contexts) {
      const s = await listWorkflowStepsByContext(db, c.contextId);
      stepList.push(...s);
    }
  }
  const tasks: TaskItem[] = stepList.map((s) => ({
      task_id: s.stepId,
      context_id: s.contextId,
      step_type: s.stepType,
      tool_name: s.toolName,
      status: s.status,
      owner: s.owner,
      created_at: s.createdAt?.toISOString() ?? null,
    }));
  return { tasks };
}

export async function getTask(
  ctx: ToolContext,
  taskId: string
): Promise<TaskItem | null> {
  const db = getDb();
  const step = await getWorkflowStepById(db, taskId);
  if (!step) return null;
  const tasks = await listTasks(ctx);
  return tasks.tasks.find((t) => t.task_id === taskId) ?? null;
}

export async function completeTask(
  _ctx: ToolContext,
  taskId: string,
  _result?: unknown
): Promise<{ success: boolean }> {
  const db = getDb();
  const step = await getWorkflowStepById(db, taskId);
  if (!step) return { success: false };
  await updateWorkflowStepStatus(db, taskId, "completed", new Date());
  return { success: true };
}

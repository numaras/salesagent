/**
 * Task/workflow tools: list_tasks, get_task, complete_task.
 */

import type { ToolContext } from "../core/auth/types.js";
import * as WorkflowService from "../services/WorkflowService.js";

export async function runListTasks(ctx: ToolContext, status?: string) {
  return WorkflowService.listTasks(ctx, status);
}

export async function runGetTask(ctx: ToolContext, taskId: string) {
  return WorkflowService.getTask(ctx, taskId);
}

export async function runCompleteTask(ctx: ToolContext, taskId: string, result?: unknown) {
  return WorkflowService.completeTask(ctx, taskId, result);
}

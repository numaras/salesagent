import { and, eq, lt } from "drizzle-orm";
import { getDb } from "../db/client.js";
import { workflowSteps } from "../db/schema.js";

export async function processApprovals(): Promise<{ autoApproved: number }> {
  const db = getDb();
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const pending = await db
    .select()
    .from(workflowSteps)
    .where(
      and(
        eq(workflowSteps.status, "requires_approval"),
        lt(workflowSteps.createdAt, cutoff)
      )
    );

  for (const step of pending) {
    await db
      .update(workflowSteps)
      .set({ status: "completed", completedAt: new Date() })
      .where(eq(workflowSteps.stepId, step.stepId));
  }

  return { autoApproved: pending.length };
}

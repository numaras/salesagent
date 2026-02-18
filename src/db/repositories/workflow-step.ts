import { and, eq } from "drizzle-orm";
import type { DrizzleDb } from "../client.js";
import { objectWorkflowMapping, workflowSteps } from "../schema.js";

export type WorkflowStepRow = typeof workflowSteps.$inferSelect;
export type ObjectWorkflowMappingRow = typeof objectWorkflowMapping.$inferSelect;
export type WorkflowStepInsert = typeof workflowSteps.$inferInsert;
export type ObjectWorkflowMappingInsert = typeof objectWorkflowMapping.$inferInsert;

export async function getWorkflowStepById(
  db: DrizzleDb,
  stepId: string
): Promise<WorkflowStepRow | undefined> {
  const rows = await db
    .select()
    .from(workflowSteps)
    .where(eq(workflowSteps.stepId, stepId))
    .limit(1);
  return rows[0];
}

export async function listWorkflowStepsByContext(
  db: DrizzleDb,
  contextId: string
): Promise<WorkflowStepRow[]> {
  return db
    .select()
    .from(workflowSteps)
    .where(eq(workflowSteps.contextId, contextId));
}

export async function listWorkflowStepsByStatus(
  db: DrizzleDb,
  status: string
): Promise<WorkflowStepRow[]> {
  return db.select().from(workflowSteps).where(eq(workflowSteps.status, status));
}

export async function listObjectMappingsByStep(
  db: DrizzleDb,
  stepId: string
): Promise<ObjectWorkflowMappingRow[]> {
  return db
    .select()
    .from(objectWorkflowMapping)
    .where(eq(objectWorkflowMapping.stepId, stepId));
}

export async function listObjectMappingsByObject(
  db: DrizzleDb,
  objectType: string,
  objectId: string
): Promise<ObjectWorkflowMappingRow[]> {
  return db
    .select()
    .from(objectWorkflowMapping)
    .where(
      and(
        eq(objectWorkflowMapping.objectType, objectType),
        eq(objectWorkflowMapping.objectId, objectId)
      )
    );
}

export async function insertWorkflowStep(
  db: DrizzleDb,
  row: WorkflowStepInsert
): Promise<WorkflowStepRow> {
  const inserted = await db.insert(workflowSteps).values(row).returning();
  return inserted[0]!;
}

export async function updateWorkflowStepStatus(
  db: DrizzleDb,
  stepId: string,
  status: string,
  completedAt?: Date
): Promise<WorkflowStepRow | undefined> {
  const updated = await db
    .update(workflowSteps)
    .set({ status, completedAt: completedAt ?? null })
    .where(eq(workflowSteps.stepId, stepId))
    .returning();
  return updated[0];
}

export async function insertObjectWorkflowMapping(
  db: DrizzleDb,
  row: ObjectWorkflowMappingInsert
): Promise<ObjectWorkflowMappingRow> {
  const inserted = await db.insert(objectWorkflowMapping).values(row).returning();
  return inserted[0]!;
}

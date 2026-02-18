import { and, eq } from "drizzle-orm";
import type { DrizzleDb } from "../client.js";
import { contexts } from "../schema.js";

export type ContextRow = typeof contexts.$inferSelect;
export type ContextInsert = typeof contexts.$inferInsert;

export async function getContextById(
  db: DrizzleDb,
  contextId: string
): Promise<ContextRow | undefined> {
  const rows = await db
    .select()
    .from(contexts)
    .where(eq(contexts.contextId, contextId))
    .limit(1);
  return rows[0];
}

export async function listContextsByTenantAndPrincipal(
  db: DrizzleDb,
  tenantId: string,
  principalId: string
): Promise<ContextRow[]> {
  return db
    .select()
    .from(contexts)
    .where(
      and(eq(contexts.tenantId, tenantId), eq(contexts.principalId, principalId))
    );
}

export async function insertContext(
  db: DrizzleDb,
  row: ContextInsert
): Promise<ContextRow> {
  const inserted = await db.insert(contexts).values(row).returning();
  return inserted[0]!;
}

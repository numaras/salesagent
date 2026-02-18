import { eq } from "drizzle-orm";
import type { DrizzleDb } from "../client.js";
import { auditLogs } from "../schema.js";

export type AuditLogRow = typeof auditLogs.$inferSelect;
export type AuditLogInsert = typeof auditLogs.$inferInsert;

export async function listAuditLogsByTenant(
  db: DrizzleDb,
  tenantId: string,
  limit = 100
): Promise<AuditLogRow[]> {
  return db
    .select()
    .from(auditLogs)
    .where(eq(auditLogs.tenantId, tenantId))
    .limit(limit);
}

export async function insertAuditLog(
  db: DrizzleDb,
  row: AuditLogInsert
): Promise<AuditLogRow> {
  const inserted = await db.insert(auditLogs).values(row).returning();
  return inserted[0]!;
}

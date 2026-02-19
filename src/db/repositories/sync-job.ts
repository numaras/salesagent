import { eq } from "drizzle-orm";
import type { DrizzleDb } from "../client.js";
import { syncJobs } from "../schema.js";

export type SyncJobRow = typeof syncJobs.$inferSelect;
export type SyncJobInsert = typeof syncJobs.$inferInsert;

export async function getSyncJobById(db: DrizzleDb, syncId: string): Promise<SyncJobRow | undefined> {
  const rows = await db.select().from(syncJobs).where(eq(syncJobs.syncId, syncId)).limit(1);
  return rows[0];
}

export async function listSyncJobsByTenant(db: DrizzleDb, tenantId: string): Promise<SyncJobRow[]> {
  return db.select().from(syncJobs).where(eq(syncJobs.tenantId, tenantId));
}

export async function insertSyncJob(db: DrizzleDb, row: SyncJobInsert): Promise<SyncJobRow> {
  const inserted = await db.insert(syncJobs).values(row).returning();
  return inserted[0]!;
}

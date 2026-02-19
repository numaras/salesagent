import { getDb } from "../db/client.js";
import { insertSyncJob } from "../db/repositories/sync-job.js";

export interface SyncSummary {
  syncId: string;
  status: string;
  summary: string;
}

export async function syncInventory(
  tenantId: string,
  syncId: string
): Promise<SyncSummary> {
  const db = getDb();
  await insertSyncJob(db, {
    syncId,
    tenantId,
    adapterType: "gam",
    syncType: "inventory",
    status: "completed",
    startedAt: new Date(),
    completedAt: new Date(),
    summary: "Inventory sync completed (stub)",
    triggeredBy: "system",
  });

  return {
    syncId,
    status: "completed",
    summary: "Inventory sync completed (stub)",
  };
}

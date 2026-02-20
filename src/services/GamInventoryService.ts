import { eq } from "drizzle-orm";
import { getDb } from "../db/client.js";
import { insertSyncJob } from "../db/repositories/sync-job.js";
import { getAdapter, ensurePrincipal } from "../core/adapterRegistry.js";
import { syncInventoryFromGam } from "../adapters/gam/managers/sync.js";
import { gamInventory } from "../db/schema.js";

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
  
  // Create an initial sync job record
  await insertSyncJob(db, {
    syncId,
    tenantId,
    adapterType: "gam",
    syncType: "inventory",
    status: "in_progress",
    startedAt: new Date(),
    summary: "Inventory sync started",
    triggeredBy: "system",
  });

  try {
    const principal = ensurePrincipal({});
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adapter = await getAdapter(tenantId, principal, false) as any;
    const clientWrapper = adapter.clientWrapper;

    if (!clientWrapper) {
      throw new Error("GAM client wrapper not found on adapter");
    }

    const { adUnits, placements } = await syncInventoryFromGam(clientWrapper, tenantId);

    const existingRecords = await db
      .select({
        id: gamInventory.id,
        inventoryType: gamInventory.inventoryType,
        inventoryId: gamInventory.inventoryId,
      })
      .from(gamInventory)
      .where(eq(gamInventory.tenantId, tenantId));

    const existingMap = new Map(
      existingRecords.map((r) => [`${r.inventoryType}_${r.inventoryId}`, r.id])
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const inserts: any[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updates: any[] = [];

    const items = [
      ...adUnits.map((u) => ({ ...u, _type: "ad_unit" })),
      ...placements.map((p) => ({ ...p, _type: "placement" })),
    ];

    for (const item of items) {
      const invId = String(item.id);
      const invType = item._type;
      const key = `${invType}_${invId}`;
      
      const record = {
        tenantId,
        inventoryType: invType,
        inventoryId: invId,
        name: item.name || `Unknown ${invType}`,
        status: item.status || "ACTIVE",
        inventoryMetadata: item,
        lastSynced: new Date(),
        updatedAt: new Date(),
      };

      if (existingMap.has(key)) {
        updates.push({ id: existingMap.get(key)!, ...record });
      } else {
        inserts.push({ ...record, createdAt: new Date() });
      }
    }

    if (inserts.length > 0) {
      for (let i = 0; i < inserts.length; i += 100) {
        await db.insert(gamInventory).values(inserts.slice(i, i + 100));
      }
    }

    // Chunk updates
    const chunkSize = 50;
    for (let i = 0; i < updates.length; i += chunkSize) {
      const chunk = updates.slice(i, i + chunkSize);
      await Promise.all(
        chunk.map((update) => {
          const { id, ...data } = update;
          return db.update(gamInventory).set(data).where(eq(gamInventory.id, id));
        })
      );
    }

    const summaryMsg = `Synced ${adUnits.length} ad units and ${placements.length} placements`;

    await insertSyncJob(db, {
      syncId,
      tenantId,
      adapterType: "gam",
      syncType: "inventory",
      status: "completed",
      startedAt: new Date(),
      completedAt: new Date(),
      summary: summaryMsg,
      triggeredBy: "system",
    });

    return {
      syncId,
      status: "completed",
      summary: summaryMsg,
    };
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : String(error);
    await insertSyncJob(db, {
      syncId,
      tenantId,
      adapterType: "gam",
      syncType: "inventory",
      status: "failed",
      startedAt: new Date(),
      completedAt: new Date(),
      summary: "Inventory sync failed",
      errorMessage: errMessage,
      triggeredBy: "system",
    });

    return {
      syncId,
      status: "failed",
      summary: `Failed: ${errMessage}`,
    };
  }
}

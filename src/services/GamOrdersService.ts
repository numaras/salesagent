import { and, eq } from "drizzle-orm";
import { getDb } from "../db/client.js";
import { gamOrders } from "../db/schema.js";
import { insertSyncJob } from "../db/repositories/sync-job.js";
import { getAdapter, ensurePrincipal } from "../core/adapterRegistry.js";
import { syncOrdersFromGam } from "../adapters/gam/managers/sync.js";

type GamOrderRow = typeof gamOrders.$inferSelect;

export interface SyncSummary {
  syncId: string;
  status: string;
  summary: string;
}

export async function listOrders(tenantId: string): Promise<GamOrderRow[]> {
  const db = getDb();
  return db
    .select()
    .from(gamOrders)
    .where(eq(gamOrders.tenantId, tenantId));
}

export async function getOrder(
  tenantId: string,
  orderId: string
): Promise<GamOrderRow | undefined> {
  const db = getDb();
  const rows = await db
    .select()
    .from(gamOrders)
    .where(
      and(eq(gamOrders.tenantId, tenantId), eq(gamOrders.orderId, orderId))
    )
    .limit(1);
  return rows[0];
}

export async function syncTenantOrders(
  tenantId: string,
  syncId: string
): Promise<SyncSummary> {
  const db = getDb();

  await insertSyncJob(db, {
    syncId,
    tenantId,
    adapterType: "gam",
    syncType: "orders",
    status: "in_progress",
    startedAt: new Date(),
    summary: "Orders sync started",
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

    const { orders } = await syncOrdersFromGam(clientWrapper, tenantId);

    const existingRecords = await db
      .select({
        id: gamOrders.id,
        orderId: gamOrders.orderId,
      })
      .from(gamOrders)
      .where(eq(gamOrders.tenantId, tenantId));

    const existingMap = new Map(
      existingRecords.map((r) => [r.orderId, r.id])
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const inserts: any[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updates: any[] = [];

    for (const order of orders) {
      const ordId = String(order.id);
      
      const record = {
        tenantId,
        orderId: ordId,
        name: order.name || "Unknown Order",
        advertiserId: order.advertiserId ? String(order.advertiserId) : null,
        status: order.status || "UNKNOWN",
        orderMetadata: order,
        lastSynced: new Date(),
        updatedAt: new Date(),
      };

      if (existingMap.has(ordId)) {
        updates.push({ id: existingMap.get(ordId)!, ...record });
      } else {
        inserts.push({ ...record, createdAt: new Date() });
      }
    }

    if (inserts.length > 0) {
      for (let i = 0; i < inserts.length; i += 100) {
        await db.insert(gamOrders).values(inserts.slice(i, i + 100));
      }
    }

    const chunkSize = 50;
    for (let i = 0; i < updates.length; i += chunkSize) {
      const chunk = updates.slice(i, i + chunkSize);
      await Promise.all(
        chunk.map((update) => {
          const { id, ...data } = update;
          return db.update(gamOrders).set(data).where(eq(gamOrders.id, id));
        })
      );
    }

    const summaryMsg = `Synced ${orders.length} orders`;

    await insertSyncJob(db, {
      syncId,
      tenantId,
      adapterType: "gam",
      syncType: "orders",
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
      syncType: "orders",
      status: "failed",
      startedAt: new Date(),
      completedAt: new Date(),
      summary: "Orders sync failed",
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

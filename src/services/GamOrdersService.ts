import { and, eq } from "drizzle-orm";
import { getDb } from "../db/client.js";
import { gamOrders } from "../db/schema.js";

type GamOrderRow = typeof gamOrders.$inferSelect;

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

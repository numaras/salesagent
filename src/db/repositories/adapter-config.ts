import { eq } from "drizzle-orm";
import type { DrizzleDb } from "../client.js";
import { adapterConfig } from "../schema.js";

export type AdapterConfigRow = typeof adapterConfig.$inferSelect;

export async function getAdapterConfigByTenant(
  db: DrizzleDb,
  tenantId: string
): Promise<AdapterConfigRow | undefined> {
  const rows = await db
    .select()
    .from(adapterConfig)
    .where(eq(adapterConfig.tenantId, tenantId))
    .limit(1);
  return rows[0];
}

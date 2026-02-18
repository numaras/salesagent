import { and, eq } from "drizzle-orm";
import type { DrizzleDb } from "../client.js";
import { creatives } from "../schema.js";

export type CreativeRow = typeof creatives.$inferSelect;

export async function getCreativeById(
  db: DrizzleDb,
  creativeId: string
): Promise<CreativeRow | undefined> {
  const rows = await db
    .select()
    .from(creatives)
    .where(eq(creatives.creativeId, creativeId))
    .limit(1);
  return rows[0];
}

export async function listCreativesByTenant(
  db: DrizzleDb,
  tenantId: string
): Promise<CreativeRow[]> {
  return db.select().from(creatives).where(eq(creatives.tenantId, tenantId));
}

export async function listCreativesByTenantAndPrincipal(
  db: DrizzleDb,
  tenantId: string,
  principalId: string
): Promise<CreativeRow[]> {
  return db
    .select()
    .from(creatives)
    .where(
      and(eq(creatives.tenantId, tenantId), eq(creatives.principalId, principalId))
    );
}

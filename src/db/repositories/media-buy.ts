import { and, eq } from "drizzle-orm";
import type { DrizzleDb } from "../client.js";
import { mediaBuys, mediaPackages } from "../schema.js";

export type MediaBuyRow = typeof mediaBuys.$inferSelect;
export type MediaPackageRow = typeof mediaPackages.$inferSelect;
export type MediaBuyInsert = typeof mediaBuys.$inferInsert;
export type MediaPackageInsert = typeof mediaPackages.$inferInsert;

export async function getMediaBuyById(
  db: DrizzleDb,
  mediaBuyId: string
): Promise<MediaBuyRow | undefined> {
  const rows = await db
    .select()
    .from(mediaBuys)
    .where(eq(mediaBuys.mediaBuyId, mediaBuyId))
    .limit(1);
  return rows[0];
}

export async function listMediaBuysByTenant(
  db: DrizzleDb,
  tenantId: string
): Promise<MediaBuyRow[]> {
  return db.select().from(mediaBuys).where(eq(mediaBuys.tenantId, tenantId));
}

export async function listMediaBuysByTenantAndPrincipal(
  db: DrizzleDb,
  tenantId: string,
  principalId: string
): Promise<MediaBuyRow[]> {
  return db
    .select()
    .from(mediaBuys)
    .where(
      and(eq(mediaBuys.tenantId, tenantId), eq(mediaBuys.principalId, principalId))
    );
}

export async function listPackagesByMediaBuy(
  db: DrizzleDb,
  mediaBuyId: string
): Promise<MediaPackageRow[]> {
  return db
    .select()
    .from(mediaPackages)
    .where(eq(mediaPackages.mediaBuyId, mediaBuyId));
}

export async function insertMediaBuy(
  db: DrizzleDb,
  row: MediaBuyInsert
): Promise<MediaBuyRow> {
  const inserted = await db.insert(mediaBuys).values(row).returning();
  return inserted[0]!;
}

export async function insertMediaPackages(
  db: DrizzleDb,
  rows: MediaPackageInsert[]
): Promise<MediaPackageRow[]> {
  if (rows.length === 0) return [];
  return db.insert(mediaPackages).values(rows).returning();
}

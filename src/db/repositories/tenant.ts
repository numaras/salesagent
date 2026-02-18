import { eq } from "drizzle-orm";
import type { DrizzleDb } from "../client.js";
import { tenants } from "../schema.js";

export type TenantRow = typeof tenants.$inferSelect;

export async function getTenantById(
  db: DrizzleDb,
  tenantId: string
): Promise<TenantRow | undefined> {
  const rows = await db.select().from(tenants).where(eq(tenants.tenantId, tenantId)).limit(1);
  return rows[0];
}

export async function getTenantBySubdomain(
  db: DrizzleDb,
  subdomain: string
): Promise<TenantRow | undefined> {
  const rows = await db.select().from(tenants).where(eq(tenants.subdomain, subdomain)).limit(1);
  return rows[0];
}

export async function getTenantByVirtualHost(
  db: DrizzleDb,
  virtualHost: string
): Promise<TenantRow | undefined> {
  const rows = await db
    .select()
    .from(tenants)
    .where(eq(tenants.virtualHost, virtualHost))
    .limit(1);
  return rows[0];
}

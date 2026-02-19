import { eq } from "drizzle-orm";
import { getDb } from "../db/client.js";
import { tenantAuthConfigs } from "../db/schema.js";

type AuthConfigRow = typeof tenantAuthConfigs.$inferSelect;
type AuthConfigInsert = Omit<typeof tenantAuthConfigs.$inferInsert, "id" | "tenantId" | "createdAt">;

export async function getAuthConfig(
  tenantId: string
): Promise<AuthConfigRow | undefined> {
  const db = getDb();
  const rows = await db
    .select()
    .from(tenantAuthConfigs)
    .where(eq(tenantAuthConfigs.tenantId, tenantId))
    .limit(1);
  return rows[0];
}

export async function updateAuthConfig(
  tenantId: string,
  config: AuthConfigInsert
): Promise<AuthConfigRow> {
  const db = getDb();
  const existing = await getAuthConfig(tenantId);

  if (existing) {
    const updated = await db
      .update(tenantAuthConfigs)
      .set({ ...config, updatedAt: new Date() })
      .where(eq(tenantAuthConfigs.tenantId, tenantId))
      .returning();
    return updated[0]!;
  }

  const inserted = await db
    .insert(tenantAuthConfigs)
    .values({ ...config, tenantId })
    .returning();
  return inserted[0]!;
}

import { eq } from "drizzle-orm";
import { getDb } from "../db/client.js";
import { tenantAuthConfigs } from "../db/schema.js";
import { decryptFromStorage, encryptForStorage } from "../core/security/encryption.js";

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
  const row = rows[0];
  if (!row) return undefined;
  return {
    ...row,
    oidcClientSecretEncrypted: row.oidcClientSecretEncrypted
      ? decryptFromStorage(row.oidcClientSecretEncrypted)
      : row.oidcClientSecretEncrypted,
  };
}

export async function updateAuthConfig(
  tenantId: string,
  config: AuthConfigInsert
): Promise<AuthConfigRow> {
  const db = getDb();
  const existing = await getAuthConfig(tenantId);
  const persistedConfig: AuthConfigInsert = {
    ...config,
    oidcClientSecretEncrypted: config.oidcClientSecretEncrypted
      ? encryptForStorage(config.oidcClientSecretEncrypted)
      : config.oidcClientSecretEncrypted,
  };

  if (existing) {
    const updated = await db
      .update(tenantAuthConfigs)
      .set({ ...persistedConfig, updatedAt: new Date() })
      .where(eq(tenantAuthConfigs.tenantId, tenantId))
      .returning();
    return {
      ...updated[0]!,
      oidcClientSecretEncrypted: updated[0]?.oidcClientSecretEncrypted
        ? decryptFromStorage(updated[0].oidcClientSecretEncrypted)
        : updated[0]?.oidcClientSecretEncrypted,
    };
  }

  const inserted = await db
    .insert(tenantAuthConfigs)
    .values({ ...persistedConfig, tenantId })
    .returning();
  return {
    ...inserted[0]!,
    oidcClientSecretEncrypted: inserted[0]?.oidcClientSecretEncrypted
      ? decryptFromStorage(inserted[0].oidcClientSecretEncrypted)
      : inserted[0]?.oidcClientSecretEncrypted,
  };
}

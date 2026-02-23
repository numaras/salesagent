import { eq } from "drizzle-orm";
import type { DrizzleDb } from "../client.js";
import { adapterConfig } from "../schema.js";
import { decryptFromStorage } from "../../core/security/encryption.js";

export type AdapterConfigRow = typeof adapterConfig.$inferSelect;

function decryptConfigJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => decryptConfigJson(item));
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = decryptConfigJson(v);
    }
    return out;
  }
  if (typeof value === "string") {
    return decryptFromStorage(value);
  }
  return value;
}

export async function getAdapterConfigByTenant(
  db: DrizzleDb,
  tenantId: string
): Promise<AdapterConfigRow | undefined> {
  const rows = await db
    .select()
    .from(adapterConfig)
    .where(eq(adapterConfig.tenantId, tenantId))
    .limit(1);
  const row = rows[0];
  if (!row) return undefined;
  return {
    ...row,
    gamRefreshToken: row.gamRefreshToken ? decryptFromStorage(row.gamRefreshToken) : row.gamRefreshToken,
    gamServiceAccountJson: row.gamServiceAccountJson
      ? decryptFromStorage(row.gamServiceAccountJson)
      : row.gamServiceAccountJson,
    configJson: decryptConfigJson(row.configJson),
  };
}

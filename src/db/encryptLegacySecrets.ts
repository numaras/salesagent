/**
 * One-time migration utility: encrypt legacy plaintext secrets in DB.
 *
 * Usage:
 *   npm run db:encrypt-secrets
 *   DRY_RUN=true npm run db:encrypt-secrets
 */

import { eq } from "drizzle-orm";
import { getDb } from "./client.js";
import { adapterConfig, creativeAgents, signalsAgents, tenantAuthConfigs } from "./schema.js";
import { encryptForStorage } from "../core/security/encryption.js";

const SENSITIVE_CONFIG_KEYS = new Set([
  "apikey",
  "api_key",
  "token",
  "secret",
  "clientsecret",
  "client_secret",
  "password",
]);

function isSensitiveConfigKey(key: string): boolean {
  const normalized = key.replace(/[^a-z0-9_]/gi, "").toLowerCase();
  if (SENSITIVE_CONFIG_KEYS.has(normalized)) return true;
  return normalized.includes("apikey") || normalized.endsWith("token") || normalized.endsWith("secret");
}

function encryptSensitiveConfigJson(value: unknown): { value: unknown; changed: boolean } {
  if (Array.isArray(value)) {
    let changed = false;
    const out = value.map((item) => {
      const result = encryptSensitiveConfigJson(item);
      changed = changed || result.changed;
      return result.value;
    });
    return { value: out, changed };
  }

  if (!value || typeof value !== "object") {
    return { value, changed: false };
  }

  let changed = false;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (typeof v === "string" && isSensitiveConfigKey(k) && v.trim().length > 0) {
      const encrypted = encryptForStorage(v.trim());
      out[k] = encrypted;
      changed = changed || encrypted !== v;
      continue;
    }
    const nested = encryptSensitiveConfigJson(v);
    out[k] = nested.value;
    changed = changed || nested.changed;
  }
  return { value: out, changed };
}

function encryptFieldIfNeeded(value: string | null): { value: string | null; changed: boolean } {
  if (!value) return { value, changed: false };
  const encrypted = encryptForStorage(value);
  return { value: encrypted, changed: encrypted !== value };
}

async function main(): Promise<void> {
  const db = getDb();
  const dryRun = process.env.DRY_RUN?.toLowerCase() === "true";

  let updatedTenantAuthConfigs = 0;
  let updatedAdapterConfigs = 0;
  let updatedCreativeAgents = 0;
  let updatedSignalsAgents = 0;

  const oidcRows = await db.select().from(tenantAuthConfigs);
  for (const row of oidcRows) {
    const enc = encryptFieldIfNeeded(row.oidcClientSecretEncrypted);
    if (!enc.changed) continue;

    updatedTenantAuthConfigs++;
    if (!dryRun) {
      await db
        .update(tenantAuthConfigs)
        .set({ oidcClientSecretEncrypted: enc.value, updatedAt: new Date() })
        .where(eq(tenantAuthConfigs.id, row.id));
    }
  }

  const adapterRows = await db.select().from(adapterConfig);
  for (const row of adapterRows) {
    const refresh = encryptFieldIfNeeded(row.gamRefreshToken);
    const serviceAccount = encryptFieldIfNeeded(row.gamServiceAccountJson);
    const configJsonResult = encryptSensitiveConfigJson(row.configJson);

    if (!refresh.changed && !serviceAccount.changed && !configJsonResult.changed) continue;

    updatedAdapterConfigs++;
    if (!dryRun) {
      await db
        .update(adapterConfig)
        .set({
          gamRefreshToken: refresh.value,
          gamServiceAccountJson: serviceAccount.value,
          configJson: configJsonResult.value as Record<string, unknown>,
          updatedAt: new Date(),
        })
        .where(eq(adapterConfig.tenantId, row.tenantId));
    }
  }

  const creativeAgentRows = await db.select().from(creativeAgents);
  for (const row of creativeAgentRows) {
    const auth = encryptFieldIfNeeded(row.authCredentials);
    if (!auth.changed) continue;

    updatedCreativeAgents++;
    if (!dryRun) {
      await db
        .update(creativeAgents)
        .set({ authCredentials: auth.value, updatedAt: new Date() })
        .where(eq(creativeAgents.id, row.id));
    }
  }

  const signalsAgentRows = await db.select().from(signalsAgents);
  for (const row of signalsAgentRows) {
    const auth = encryptFieldIfNeeded(row.authCredentials);
    if (!auth.changed) continue;

    updatedSignalsAgents++;
    if (!dryRun) {
      await db
        .update(signalsAgents)
        .set({ authCredentials: auth.value, updatedAt: new Date() })
        .where(eq(signalsAgents.id, row.id));
    }
  }

  console.log(JSON.stringify({
    dryRun,
    updatedTenantAuthConfigs,
    updatedAdapterConfigs,
    updatedCreativeAgents,
    updatedSignalsAgents,
  }, null, 2));
}

main().catch((err) => {
  console.error("Legacy secret encryption failed:", err);
  process.exit(1);
});


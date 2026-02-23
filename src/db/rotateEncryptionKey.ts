/**
 * Re-encrypt stored secrets from OLD_ENCRYPTION_KEY to ENCRYPTION_KEY.
 *
 * Usage:
 *   OLD_ENCRYPTION_KEY=... ENCRYPTION_KEY=... npm run db:rotate-encryption-key
 *   DRY_RUN=true OLD_ENCRYPTION_KEY=... ENCRYPTION_KEY=... npm run db:rotate-encryption-key
 */

import { createDecipheriv } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb } from "./client.js";
import { adapterConfig, creativeAgents, signalsAgents, tenantAuthConfigs } from "./schema.js";
import { encryptForStorage } from "../core/security/encryption.js";

const ENCRYPTED_PREFIX = "enc:v1:";

function keyFromRaw(raw: string): Buffer {
  if (raw.length === 64) return Buffer.from(raw, "hex");
  return Buffer.from(raw, "base64").subarray(0, 32);
}

function decryptWithKey(ciphertextBase64: string, key: Buffer): string {
  const buf = Buffer.from(ciphertextBase64, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const enc = buf.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}

function rotateEncryptedValue(value: string | null, oldKey: Buffer): { value: string | null; changed: boolean } {
  if (!value || !value.startsWith(ENCRYPTED_PREFIX)) return { value, changed: false };
  const plaintext = decryptWithKey(value.slice(ENCRYPTED_PREFIX.length), oldKey);
  const rotated = encryptForStorage(plaintext);
  return { value: rotated, changed: rotated !== value };
}

async function main(): Promise<void> {
  const oldRaw = process.env.OLD_ENCRYPTION_KEY;
  if (!oldRaw) {
    throw new Error("OLD_ENCRYPTION_KEY is required");
  }

  const oldKey = keyFromRaw(oldRaw);
  const dryRun = process.env.DRY_RUN?.toLowerCase() === "true";
  const db = getDb();

  let updatedTenantAuthConfigs = 0;
  let updatedAdapterConfigs = 0;
  let updatedCreativeAgents = 0;
  let updatedSignalsAgents = 0;

  const oidcRows = await db.select().from(tenantAuthConfigs);
  for (const row of oidcRows) {
    const rotated = rotateEncryptedValue(row.oidcClientSecretEncrypted, oldKey);
    if (!rotated.changed) continue;
    updatedTenantAuthConfigs++;
    if (!dryRun) {
      await db
        .update(tenantAuthConfigs)
        .set({ oidcClientSecretEncrypted: rotated.value, updatedAt: new Date() })
        .where(eq(tenantAuthConfigs.id, row.id));
    }
  }

  const adapterRows = await db.select().from(adapterConfig);
  for (const row of adapterRows) {
    const refresh = rotateEncryptedValue(row.gamRefreshToken, oldKey);
    const svc = rotateEncryptedValue(row.gamServiceAccountJson, oldKey);
    if (!refresh.changed && !svc.changed) continue;
    updatedAdapterConfigs++;
    if (!dryRun) {
      await db
        .update(adapterConfig)
        .set({
          gamRefreshToken: refresh.value,
          gamServiceAccountJson: svc.value,
          updatedAt: new Date(),
        })
        .where(eq(adapterConfig.tenantId, row.tenantId));
    }
  }

  const creativeRows = await db.select().from(creativeAgents);
  for (const row of creativeRows) {
    const rotated = rotateEncryptedValue(row.authCredentials, oldKey);
    if (!rotated.changed) continue;
    updatedCreativeAgents++;
    if (!dryRun) {
      await db
        .update(creativeAgents)
        .set({ authCredentials: rotated.value, updatedAt: new Date() })
        .where(eq(creativeAgents.id, row.id));
    }
  }

  const signalsRows = await db.select().from(signalsAgents);
  for (const row of signalsRows) {
    const rotated = rotateEncryptedValue(row.authCredentials, oldKey);
    if (!rotated.changed) continue;
    updatedSignalsAgents++;
    if (!dryRun) {
      await db
        .update(signalsAgents)
        .set({ authCredentials: rotated.value, updatedAt: new Date() })
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
  console.error("Encryption key rotation failed:", err);
  process.exit(1);
});


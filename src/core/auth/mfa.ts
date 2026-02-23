import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb } from "../../db/client.js";
import { superadminConfig } from "../../db/schema.js";
import { decryptFromStorage, encryptForStorage } from "../security/encryption.js";

const TOTP_STEP_SECONDS = 30;
const TOTP_DIGITS = 6;
const MFA_CONFIG_KEY_PREFIX = "mfa_secret:";

function mfaConfigKey(tenantId: string): string {
  return `${MFA_CONFIG_KEY_PREFIX}${tenantId}`;
}

function base32Decode(input: string): Buffer {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const normalized = input.toUpperCase().replace(/=+$/g, "").replace(/[^A-Z2-7]/g, "");
  let bits = "";
  for (const ch of normalized) {
    const idx = alphabet.indexOf(ch);
    if (idx < 0) continue;
    bits += idx.toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(Number.parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

function normalizeSecret(secret: string): Buffer {
  if (!secret) return Buffer.alloc(0);
  if (/^[A-Za-z2-7]+=*$/i.test(secret)) {
    return base32Decode(secret);
  }
  return Buffer.from(secret, "utf8");
}

function counterBuffer(counter: number): Buffer {
  const buf = Buffer.alloc(8);
  buf.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  buf.writeUInt32BE(counter >>> 0, 4);
  return buf;
}

function generateTotp(secret: Buffer, timestampMs: number): string {
  const counter = Math.floor(timestampMs / 1000 / TOTP_STEP_SECONDS);
  const digest = createHmac("sha1", secret).update(counterBuffer(counter)).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const codeInt =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);
  return String(codeInt % 10 ** TOTP_DIGITS).padStart(TOTP_DIGITS, "0");
}

function safeStringEqual(a: string, b: string): boolean {
  const aa = Buffer.from(a);
  const bb = Buffer.from(b);
  if (aa.length !== bb.length) return false;
  return timingSafeEqual(aa, bb);
}

export function verifyMfaCodeForSecret(secretRaw: string, inputCode: string): boolean {
  const secret = normalizeSecret(secretRaw);
  if (!secret.length) return false;

  const code = inputCode.trim();
  if (!/^\d{6}$/.test(code)) return false;

  const now = Date.now();
  for (const drift of [-1, 0, 1]) {
    const candidate = generateTotp(secret, now + drift * TOTP_STEP_SECONDS * 1000);
    if (safeStringEqual(candidate, code)) {
      return true;
    }
  }
  return false;
}

export function generateBase32Secret(length = 32): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return out;
}

export function getOtpAuthUri(secret: string, accountName: string, issuer = "Prebid Sales Agent"): string {
  const label = encodeURIComponent(`${issuer}:${accountName}`);
  const qs = new URLSearchParams({
    secret,
    issuer,
    algorithm: "SHA1",
    digits: String(TOTP_DIGITS),
    period: String(TOTP_STEP_SECONDS),
  });
  return `otpauth://totp/${label}?${qs.toString()}`;
}

async function getStoredMfaSecret(tenantId: string): Promise<string | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(superadminConfig)
    .where(eq(superadminConfig.configKey, mfaConfigKey(tenantId)))
    .limit(1);
  const row = rows[0];
  if (!row?.configValue) return null;
  return decryptFromStorage(row.configValue);
}

export async function getMfaSource(tenantId: string): Promise<"db" | "env" | "none"> {
  const dbSecret = await getStoredMfaSecret(tenantId);
  if (dbSecret) return "db";
  if (process.env.ADMIN_MFA_SECRET) return "env";
  return "none";
}

export async function getEffectiveMfaSecret(tenantId: string): Promise<string | null> {
  const dbSecret = await getStoredMfaSecret(tenantId);
  if (dbSecret) return dbSecret;
  if (process.env.ADMIN_MFA_SECRET) return process.env.ADMIN_MFA_SECRET;
  return null;
}

export async function isMfaEnabled(tenantId: string): Promise<boolean> {
  return Boolean(await getEffectiveMfaSecret(tenantId));
}

export async function verifyMfaCode(tenantId: string, inputCode: string): Promise<boolean> {
  const secret = await getEffectiveMfaSecret(tenantId);
  if (!secret) return true;
  return verifyMfaCodeForSecret(secret, inputCode);
}

export async function saveMfaSecret(tenantId: string, secret: string, updatedBy?: string): Promise<void> {
  const db = getDb();
  const configKey = mfaConfigKey(tenantId);
  const encrypted = encryptForStorage(secret);
  const now = new Date();
  const existing = await db.select().from(superadminConfig).where(eq(superadminConfig.configKey, configKey)).limit(1);
  if (existing[0]) {
    await db
      .update(superadminConfig)
      .set({ configValue: encrypted, description: "Tenant MFA secret", updatedAt: now, updatedBy: updatedBy ?? null })
      .where(eq(superadminConfig.configKey, configKey));
    return;
  }
  await db.insert(superadminConfig).values({
    configKey,
    configValue: encrypted,
    description: "Tenant MFA secret",
    updatedAt: now,
    updatedBy: updatedBy ?? null,
  });
}

export async function clearMfaSecret(tenantId: string, updatedBy?: string): Promise<void> {
  const db = getDb();
  const configKey = mfaConfigKey(tenantId);
  await db
    .update(superadminConfig)
    .set({ configValue: null, updatedAt: new Date(), updatedBy: updatedBy ?? null })
    .where(eq(superadminConfig.configKey, configKey));
}

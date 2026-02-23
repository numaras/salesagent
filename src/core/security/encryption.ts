/**
 * Encrypt/decrypt API keys stored in DB.
 * Uses AES-256-GCM with ENCRYPTION_KEY env var (32 bytes hex or base64).
 */

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGO = "aes-256-gcm";
const ENCRYPTED_PREFIX = "enc:v1:";

function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) throw new Error("ENCRYPTION_KEY env var required for encryption");
  if (raw.length === 64) return Buffer.from(raw, "hex");
  return Buffer.from(raw, "base64").subarray(0, 32);
}

export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

export function decrypt(ciphertext: string): string {
  const key = getKey();
  const buf = Buffer.from(ciphertext, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const enc = buf.subarray(28);
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}

export function encryptForStorage(plaintext: string): string {
  if (!plaintext) return plaintext;
  if (plaintext.startsWith(ENCRYPTED_PREFIX)) return plaintext;
  return `${ENCRYPTED_PREFIX}${encrypt(plaintext)}`;
}

export function decryptFromStorage(value: string): string {
  if (!value) return value;
  if (!value.startsWith(ENCRYPTED_PREFIX)) {
    // Backward compatibility for legacy plaintext rows.
    return value;
  }
  return decrypt(value.slice(ENCRYPTED_PREFIX.length));
}

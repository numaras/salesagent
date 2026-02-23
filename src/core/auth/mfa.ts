import { createHmac, timingSafeEqual } from "node:crypto";

const TOTP_STEP_SECONDS = 30;
const TOTP_DIGITS = 6;

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

export function isMfaEnabled(): boolean {
  return Boolean(process.env.ADMIN_MFA_SECRET);
}

export function verifyMfaCode(inputCode: string): boolean {
  const secretRaw = process.env.ADMIN_MFA_SECRET;
  if (!secretRaw) return true;
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


/**
 * HMAC-SHA256 webhook signing and verification.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

export function signPayload(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function verifySignature(payload: string, secret: string, signature: string): boolean {
  const expected = signPayload(payload, secret);
  if (expected.length !== signature.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

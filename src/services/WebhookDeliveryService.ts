/**
 * Webhook delivery with HMAC signing and exponential-backoff retry.
 */

import { eq } from "drizzle-orm";
import { signPayload } from "../core/security/hmac.js";
import { isUrlSafe } from "../core/security/ssrf.js";
import { ValidationError } from "../core/errors.js";
import { getDb } from "../db/client.js";
import { webhookDeliveries } from "../db/schema.js";

export interface DeliveryResult {
  success: boolean;
  statusCode?: number;
  error?: string;
}

export async function deliverWebhook(
  deliveryId: string,
  url: string,
  payload: unknown,
  secret?: string
): Promise<DeliveryResult> {
  if (!isUrlSafe(url)) {
    throw new ValidationError(`Webhook URL blocked by SSRF policy: ${url}`);
  }

  const body = JSON.stringify(payload);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Webhook-Delivery-Id": deliveryId,
  };

  if (secret) {
    headers["X-Webhook-Signature"] = `sha256=${signPayload(body, secret)}`;
  }

  try {
    const response = await fetch(url, { method: "POST", headers, body });
    if (response.ok) {
      return { success: true, statusCode: response.status };
    }
    return {
      success: false,
      statusCode: response.status,
      error: `HTTP ${response.status} ${response.statusText}`,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown fetch error",
    };
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function processWebhookWithRetry(
  deliveryId: string,
  url: string,
  payload: unknown,
  secret?: string,
  maxRetries = 3
): Promise<DeliveryResult> {
  const db = getDb();
  let lastResult: DeliveryResult = { success: false, error: "No attempts made" };

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      const backoffMs = 1000 * Math.pow(2, attempt - 1);
      await delay(backoffMs);
    }

    lastResult = await deliverWebhook(deliveryId, url, payload, secret);

    await db
      .update(webhookDeliveries)
      .set({
        attempts: attempt + 1,
        lastAttemptAt: new Date(),
        status: lastResult.success ? "delivered" : "pending",
        lastError: lastResult.error ?? null,
        responseCode: lastResult.statusCode ?? null,
        ...(lastResult.success ? { deliveredAt: new Date() } : {}),
      })
      .where(eq(webhookDeliveries.deliveryId, deliveryId));

    if (lastResult.success) return lastResult;
  }

  await db
    .update(webhookDeliveries)
    .set({ status: "failed" })
    .where(eq(webhookDeliveries.deliveryId, deliveryId));

  return lastResult;
}

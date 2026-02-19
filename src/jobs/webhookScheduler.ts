/**
 * Background job: deliver pending webhooks from the queue.
 */

import { getDb } from "../db/client.js";
import { listPendingWebhooks } from "../db/repositories/webhook.js";
import { processWebhookWithRetry } from "../services/WebhookDeliveryService.js";

export async function processWebhookQueue(): Promise<void> {
  const db = getDb();
  const pending = await listPendingWebhooks(db);

  for (const wh of pending) {
    try {
      await processWebhookWithRetry(
        wh.deliveryId,
        wh.webhookUrl,
        wh.payload,
      );
    } catch (err) {
      console.error(
        `[webhookScheduler] delivery ${wh.deliveryId} failed:`,
        err,
      );
    }
  }
}

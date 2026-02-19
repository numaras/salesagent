import { randomUUID } from "node:crypto";
import { getDb } from "../db/client.js";
import {
  listPushConfigsByPrincipal,
  insertWebhookDelivery,
} from "../db/repositories/webhook.js";

export async function sendPushNotification(
  tenantId: string,
  principalId: string,
  eventType: string,
  payload: Record<string, unknown>
): Promise<{ queued: number }> {
  const db = getDb();
  const configs = await listPushConfigsByPrincipal(db, tenantId, principalId);
  const activeConfigs = configs.filter((c) => c.isActive);

  for (const config of activeConfigs) {
    await insertWebhookDelivery(db, {
      deliveryId: randomUUID(),
      tenantId,
      webhookUrl: config.url,
      payload,
      eventType,
      status: "pending",
    });
  }

  return { queued: activeConfigs.length };
}

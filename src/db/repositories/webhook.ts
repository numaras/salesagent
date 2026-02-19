import { eq } from "drizzle-orm";
import type { DrizzleDb } from "../client.js";
import { webhookDeliveries, pushNotificationConfigs } from "../schema.js";

export type WebhookDeliveryRow = typeof webhookDeliveries.$inferSelect;
export type WebhookDeliveryInsert = typeof webhookDeliveries.$inferInsert;
export type PushNotificationConfigRow = typeof pushNotificationConfigs.$inferSelect;

export async function listPendingWebhooks(db: DrizzleDb): Promise<WebhookDeliveryRow[]> {
  return db.select().from(webhookDeliveries).where(eq(webhookDeliveries.status, "pending"));
}

export async function insertWebhookDelivery(db: DrizzleDb, row: WebhookDeliveryInsert): Promise<WebhookDeliveryRow> {
  const inserted = await db.insert(webhookDeliveries).values(row).returning();
  return inserted[0]!;
}

export async function listPushConfigsByPrincipal(db: DrizzleDb, tenantId: string, _principalId: string): Promise<PushNotificationConfigRow[]> {
  return db.select().from(pushNotificationConfigs)
    .where(eq(pushNotificationConfigs.tenantId, tenantId));
}

/**
 * Sync operations — pull orders and inventory from GAM into the local DB.
 */

import type { GamClientWrapper } from "../client.js";

/**
 * Sync orders from GAM for a tenant.
 * TODO: Page through OrderService.getOrdersByStatement and upsert locally.
 */
export async function syncOrdersFromGam(
  _client: GamClientWrapper,
  _tenantId: string
): Promise<{ synced: number }> {
  return { synced: 0 };
}

/**
 * Sync inventory (ad units) from GAM for a tenant.
 * TODO: Page through AdUnitService and upsert locally.
 */
export async function syncInventoryFromGam(
  _client: GamClientWrapper,
  _tenantId: string
): Promise<{ synced: number }> {
  return { synced: 0 };
}

/**
 * Sync operations — pull orders and inventory from GAM into the local DB.
 */

import { StatementBuilder } from "@guardian/google-admanager-api";
import type { GamClientWrapper } from "../client.js";
import { discoverAdUnits, discoverPlacements } from "./inventory.js";

/**
 * Sync orders from GAM for a tenant.
 */
export async function syncOrdersFromGam(
  client: GamClientWrapper,
  _tenantId: string
// eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<{ orders: any[] }> {
  const orderService = await client.getOrderService();
  const statementBuilder = new StatementBuilder().limit(500);

  let totalResultSetSize = 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allOrders: any[] = [];

  do {
    const page = await orderService.getOrdersByStatement(statementBuilder.toStatement());
    if (page.results) {
      allOrders.push(...page.results);
    }

    totalResultSetSize = page.totalResultSetSize || 0;
    statementBuilder.increaseOffsetBy(500);
  } while ((statementBuilder.getOffset() || 0) < totalResultSetSize);

  return { orders: allOrders };
}

/**
 * Sync inventory (ad units) from GAM for a tenant.
 */
export async function syncInventoryFromGam(
  client: GamClientWrapper,
  _tenantId: string
// eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<{ adUnits: any[]; placements: any[] }> {
  const { adUnits } = await discoverAdUnits(client);
  const { placements } = await discoverPlacements(client);

  return { adUnits, placements };
}

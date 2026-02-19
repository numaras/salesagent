/**
 * HITL workflow helpers — activate / pause orders in GAM.
 */

import type { GamClientWrapper } from "../client.js";

/**
 * Activate (approve) an order in GAM so it starts delivering.
 * TODO: Use OrderService.performOrderAction with ApproveOrders.
 */
export async function activateOrder(
  _client: GamClientWrapper,
  _orderId: string
): Promise<{ activated: boolean }> {
  return { activated: true };
}

/**
 * Pause an order in GAM to stop delivery.
 * TODO: Use OrderService.performOrderAction with PauseOrders.
 */
export async function pauseOrder(
  _client: GamClientWrapper,
  _orderId: string
): Promise<{ paused: boolean }> {
  return { paused: true };
}

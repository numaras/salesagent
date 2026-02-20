/**
 * HITL workflow helpers — activate / pause orders in GAM.
 */

import { StatementBuilder } from "@guardian/google-admanager-api";
import type { GamClientWrapper } from "../client.js";

/**
 * Activate (approve) an order in GAM so it starts delivering.
 */
export async function activateOrder(
  client: GamClientWrapper,
  orderId: string
): Promise<{ activated: boolean }> {
  const orderService = await client.getOrderService();

  const action = {
    attributes: { "xsi:type": "ApproveOrders" }
  };

  const statement = new StatementBuilder()
    .where("id = :id")
    .addValue("id", { value: orderId.toString() })
    .toStatement();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await orderService.performOrderAction(action as any, statement);

  return { activated: true };
}

/**
 * Pause an order in GAM to stop delivery.
 */
export async function pauseOrder(
  client: GamClientWrapper,
  orderId: string
): Promise<{ paused: boolean }> {
  const orderService = await client.getOrderService();

  const action = {
    attributes: { "xsi:type": "PauseOrders" }
  };

  const statement = new StatementBuilder()
    .where("id = :id")
    .addValue("id", { value: orderId.toString() })
    .toStatement();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await orderService.performOrderAction(action as any, statement);

  return { paused: true };
}

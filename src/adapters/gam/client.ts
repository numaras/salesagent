/**
 * GAM client wrapper (mockable for tests).
 * Creates AdManagerClient and exposes OrderService and LineItemService.
 */

import {
  AdManagerClient,
  type LineItemService,
  type OrderService,
} from "@guardian/google-admanager-api";
import { buildGamCredential } from "./auth.js";
import type { GamConfig } from "./types.js";

const APPLICATION_NAME = "Prebid Sales Agent";

/** Wrapper interface so tests can mock order/line item operations. */
export interface GamClientWrapper {
  getOrderService(): Promise<OrderService>;
  getLineItemService(): Promise<LineItemService>;
}

/** Create a real GAM client wrapper from config. */
export function createGamClient(config: GamConfig): GamClientWrapper {
  const networkCode = parseInt(config.networkCode, 10);
  if (Number.isNaN(networkCode)) {
    throw new Error("GAM config networkCode must be a numeric string");
  }
  const credential = buildGamCredential(config);
  const client = new AdManagerClient(networkCode, credential, APPLICATION_NAME);

  return {
    async getOrderService(): Promise<OrderService> {
      return client.getService("OrderService");
    },
    async getLineItemService(): Promise<LineItemService> {
      return client.getService("LineItemService");
    },
  };
}

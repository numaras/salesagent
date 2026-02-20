/**
 * GAM client wrapper (mockable for tests).
 * Creates AdManagerClient and exposes OrderService and LineItemService.
 */

import {
  AdManagerClient,
  type LineItemService,
  type OrderService,
  type InventoryService,
  type PlacementService,
  type CustomTargetingService,
  type CreativeService,
  type ReportService,
  type LineItemCreativeAssociationService,
  type NetworkService,
  type UserService,
  type LabelService,
} from "@guardian/google-admanager-api";
import { buildGamCredential } from "./auth.js";
import type { GamConfig } from "./types.js";

const APPLICATION_NAME = "Prebid Sales Agent";

/** Wrapper interface so tests can mock order/line item operations. */
export interface GamClientWrapper {
  getOrderService(): Promise<OrderService>;
  getLineItemService(): Promise<LineItemService>;
  getInventoryService(): Promise<InventoryService>;
  getPlacementService(): Promise<PlacementService>;
  getCustomTargetingService(): Promise<CustomTargetingService>;
  getCreativeService(): Promise<CreativeService>;
  getReportService(): Promise<ReportService>;
  getLineItemCreativeAssociationService(): Promise<LineItemCreativeAssociationService>;
  getNetworkService(): Promise<NetworkService>;
  getUserService(): Promise<UserService>;
  getLabelService(): Promise<LabelService>;
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
    async getInventoryService(): Promise<InventoryService> {
      return client.getService("InventoryService");
    },
    async getPlacementService(): Promise<PlacementService> {
      return client.getService("PlacementService");
    },
    async getCustomTargetingService(): Promise<CustomTargetingService> {
      return client.getService("CustomTargetingService");
    },
    async getCreativeService(): Promise<CreativeService> {
      return client.getService("CreativeService");
    },
    async getReportService(): Promise<ReportService> {
      return client.getService("ReportService");
    },
    async getLineItemCreativeAssociationService(): Promise<LineItemCreativeAssociationService> {
      return client.getService("LineItemCreativeAssociationService");
    },
    async getNetworkService(): Promise<NetworkService> {
      return client.getService("NetworkService");
    },
    async getUserService(): Promise<UserService> {
      return client.getService("UserService");
    },
    async getLabelService(): Promise<LabelService> {
      return client.getService("LabelService");
    },
  };
}

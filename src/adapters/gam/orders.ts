/**
 * GAM order + line item creation (minimal flow for create_media_buy).
 * Uses client wrapper so tests can mock it.
 */

import {
  ApproveOrders,
  CostType,
  CreativeSizeType,
  GoalType,
  LineItemType,
  StatementBuilder,
  UnitType,
} from "@guardian/google-admanager-api";
import type { GamClientWrapper } from "./client.js";
import { getGamCostType, getDefaultPriority, selectLineItemType } from "./pricingCompatibility.js";
import type { PricingModel } from "./pricingCompatibility.js";

const TIMEZONE = "America/New_York";

function toDateTime(d: Date): { date: { year: number; month: number; day: number }; hour: number; minute: number; second: number; timeZoneId: string } {
  return {
    date: { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() },
    hour: d.getHours(),
    minute: d.getMinutes(),
    second: d.getSeconds(),
    timeZoneId: TIMEZONE,
  };
}

export interface CreateOrderParams {
  advertiserId: string;
  traffickerId: string;
  orderName: string;
  buyerRef?: string;
  poNumber?: string;
  startTime: Date;
  endTime: Date;
  currency?: string;
  /** First package used for line item (name, cpm, impressions, delivery_type). */
  packageName: string;
  packageCpm: number;
  packageImpressions: number;
  isGuaranteed: boolean;
  pricingModel: PricingModel;
}

/**
 * Create one order and one line item in GAM, then approve the order.
 * Returns the created order id as string.
 */
export async function createOrderWithLineItems(
  client: GamClientWrapper,
  params: CreateOrderParams
): Promise<string> {
  const {
    advertiserId,
    traffickerId,
    orderName,
    startTime,
    endTime,
    currency = "USD",
    packageName,
    packageCpm,
    packageImpressions,
    isGuaranteed,
    pricingModel,
  } = params;

  const advId = parseInt(advertiserId, 10);
  const traffId = parseInt(traffickerId, 10);
  if (Number.isNaN(advId) || Number.isNaN(traffId)) {
    throw new Error("advertiserId and traffickerId must be numeric");
  }

  const lineItemType = selectLineItemType(pricingModel, isGuaranteed);
  const costType = getGamCostType(pricingModel);
  const costTypeEnum = costType as CostType;
  const priority = getDefaultPriority(lineItemType);

  const startDt = toDateTime(startTime);
  const endDt = toDateTime(endTime);

  const orderService = await client.getOrderService();
  const totalBudgetMicro = Math.round(packageCpm * packageImpressions * 1000); // CPM = cost per 1000
  const orders = await orderService.createOrders([
    {
      name: orderName.slice(0, 255),
      advertiserId: advId,
      traffickerId: traffId,
      totalBudget: { currencyCode: currency, microAmount: totalBudgetMicro },
      startDateTime: startDt,
      endDateTime: endDt,
      ...(params.poNumber && { poNumber: params.poNumber.slice(0, 63) }),
    },
  ]);
  if (!orders?.length || orders[0].id == null) {
    throw new Error("Order creation failed: no order returned");
  }
  const orderId = orders[0].id;

  const lineItemService = await client.getLineItemService();
  const costPerUnitMicro =
    costType === "CPD"
      ? Math.round((packageCpm * packageImpressions) / Math.max(1, (endTime.getTime() - startTime.getTime()) / (24 * 60 * 60 * 1000)))
      : costType === "CPM"
        ? Math.round(packageCpm * 1000)
        : costType === "CPC"
          ? Math.round(packageCpm * 1_000_000)
          : Math.round(packageCpm * 1000);

  const lineItemTypeEnum =
    lineItemType === "STANDARD"
      ? LineItemType.STANDARD
      : lineItemType === "SPONSORSHIP"
        ? LineItemType.SPONSORSHIP
        : lineItemType === "NETWORK"
          ? LineItemType.NETWORK
          : lineItemType === "PRICE_PRIORITY"
            ? LineItemType.PRICE_PRIORITY
            : lineItemType === "BULK"
              ? LineItemType.BULK
              : LineItemType.HOUSE;

  await lineItemService.createLineItems([
    {
      orderId,
      name: packageName.slice(0, 255),
      startDateTime: startDt,
      endDateTime: endDt,
      lineItemType: lineItemTypeEnum,
      costType: costTypeEnum,
      costPerUnit: { currencyCode: currency, microAmount: costPerUnitMicro },
      priority,
      primaryGoal: { goalType: GoalType.LIFETIME, unitType: UnitType.IMPRESSIONS, units: packageImpressions },
      creativePlaceholders: [
        { size: { width: 1, height: 1, isAspectRatio: false }, creativeSizeType: CreativeSizeType.PIXEL },
      ],
      targeting: {},
    },
  ]);

  const approve = new ApproveOrders();
  const statement = new StatementBuilder().where("id = :id").addValue("id", orderId).toStatement();
  await orderService.performOrderAction(approve, statement);

  return String(orderId);
}

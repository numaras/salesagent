/**
 * Media buy tools: create, update, delivery, performance index.
 */

import type { ToolContext } from "../core/auth/types.js";
import type {
  CreateMediaBuyRequest,
  CreateMediaBuyResponse,
  ReportingPeriod,
  UpdateMediaBuyResponse,
  PackagePerformance,
} from "../types/adcp.js";
import * as MediaBuyService from "../services/MediaBuyService.js";

export async function runCreateMediaBuy(
  ctx: ToolContext,
  request: CreateMediaBuyRequest
): Promise<CreateMediaBuyResponse> {
  const start = (request as Record<string, unknown>).start_date as string | undefined;
  const end = (request as Record<string, unknown>).end_date as string | undefined;
  const startDate = start ? new Date(start) : new Date();
  const endDate = end ? new Date(end) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  return MediaBuyService.createMediaBuy(ctx, request, startDate, endDate);
}

export async function runGetMediaBuyDelivery(
  ctx: ToolContext,
  mediaBuyId: string,
  dateRange: ReportingPeriod
) {
  return MediaBuyService.getMediaBuyDelivery(ctx, mediaBuyId, dateRange);
}

export async function runUpdateMediaBuy(
  ctx: ToolContext,
  mediaBuyId: string,
  buyerRef: string,
  action: string,
  packageId: string | null,
  budget: number | null
): Promise<UpdateMediaBuyResponse> {
  return MediaBuyService.updateMediaBuy(ctx, mediaBuyId, buyerRef, action, packageId, budget);
}

export async function runUpdatePerformanceIndex(
  ctx: ToolContext,
  mediaBuyId: string,
  packagePerformance: PackagePerformance[]
): Promise<boolean> {
  return MediaBuyService.updatePerformanceIndex(ctx, mediaBuyId, packagePerformance);
}

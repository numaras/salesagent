/**
 * Media buy application service: create, update, get delivery.
 * Uses repositories + adapter; tools call this service.
 */

import { getDb, withTransaction } from "../db/client.js";
import {
  getMediaBuyById,
  insertMediaBuy,
  insertMediaPackages,
} from "../db/repositories/media-buy.js";
import { getAdapter } from "../core/adapterRegistry.js";
import { toPrincipal } from "../core/adapterRegistry.js";
import type { ToolContext } from "../core/auth/types.js";
import type {
  CreateMediaBuyRequest,
  CreateMediaBuyResponse,
  MediaPackage,
  ReportingPeriod,
  AdapterGetMediaBuyDeliveryResponse,
  UpdateMediaBuyResponse,
  PackagePerformance,
} from "../types/adcp.js";

export async function createMediaBuy(
  ctx: ToolContext,
  request: CreateMediaBuyRequest,
  startDate: Date,
  endDate: Date
): Promise<CreateMediaBuyResponse> {
  const principal = ctx.principal ? toPrincipal(ctx.principal) : { principal_id: ctx.principalId ?? "", name: "anonymous", platform_mappings: {} };
  const adapter = await getAdapter(ctx.tenantId, principal, false);

  const productIds = request.product_ids ?? [];
  if (productIds.length === 0) {
    return { status: "error", error: "product_ids required" };
  }

  const packages: MediaPackage[] = (request.packages as MediaPackage[]) ?? [];
  if (packages.length === 0) {
    return { status: "error", error: "at least one package required" };
  }

  const buyerRef = (request as Record<string, unknown>).buyer_ref as string | undefined;
  const poNumber = (request as Record<string, unknown>).po_number as string | undefined;
  const mediaBuyId = poNumber ? `buy_${poNumber}` : `buy_${crypto.randomUUID().slice(0, 8)}`;
  const orderName = (request as Record<string, unknown>).order_name as string | undefined ?? `Order ${mediaBuyId}`;
  const advertiserName = (request as Record<string, unknown>).advertiser_name as string | undefined ?? principal.name;
  const budget = typeof request.budget === "object" && request.budget && "total" in request.budget
    ? (request.budget as { total: number }).total
    : typeof request.budget === "number"
      ? request.budget
      : packages.reduce((s, p) => s + (p.budget ?? 0), 0);
  const currency = typeof request.budget === "object" && request.budget && "currency" in request.budget
    ? (request.budget as { currency: string }).currency
    : "USD";

  const adapterResponse = await adapter.create_media_buy(
    request,
    packages,
    startDate,
    endDate
  );

  if (adapterResponse.status === "error") {
    return adapterResponse;
  }

  await withTransaction(async (tx) => {
    await insertMediaBuy(tx, {
      mediaBuyId,
      tenantId: ctx.tenantId,
      principalId: ctx.principalId ?? "",
      buyerRef: buyerRef ?? undefined,
      orderName,
      advertiserName,
      budget: String(budget),
      currency,
      startDate: startDate.toISOString().slice(0, 10),
      endDate: endDate.toISOString().slice(0, 10),
      status: "draft",
      rawRequest: request as unknown as Record<string, unknown>,
    });
    await insertMediaPackages(
      tx,
      packages.map((p) => ({
        mediaBuyId,
        packageId: p.package_id,
        budget: p.budget != null ? String(p.budget) : null,
        packageConfig: p as unknown as Record<string, unknown>,
      }))
    );
  });

  return {
    status: "success",
    media_buy_id: adapterResponse.media_buy_id ?? mediaBuyId,
    buyer_ref: adapterResponse.buyer_ref ?? buyerRef ?? "unknown",
  };
}

export async function getMediaBuyDelivery(
  ctx: ToolContext,
  mediaBuyId: string,
  dateRange: ReportingPeriod
): Promise<AdapterGetMediaBuyDeliveryResponse> {
  const db = getDb();
  const row = await getMediaBuyById(db, mediaBuyId);
  if (!row || row.tenantId !== ctx.tenantId) {
    return { media_buy_id: mediaBuyId };
  }
  const principal = ctx.principal ? toPrincipal(ctx.principal) : { principal_id: ctx.principalId ?? "", name: "anonymous", platform_mappings: {} };
  const adapter = await getAdapter(ctx.tenantId, principal, false);
  const today = new Date();
  return adapter.get_media_buy_delivery(mediaBuyId, dateRange, today);
}

export async function updateMediaBuy(
  ctx: ToolContext,
  mediaBuyId: string,
  buyerRef: string,
  action: string,
  packageId: string | null,
  budget: number | null
): Promise<UpdateMediaBuyResponse> {
  const principal = ctx.principal ? toPrincipal(ctx.principal) : { principal_id: ctx.principalId ?? "", name: "anonymous", platform_mappings: {} };
  const adapter = await getAdapter(ctx.tenantId, principal, false);
  const today = new Date();
  return adapter.update_media_buy(mediaBuyId, buyerRef, action, packageId, budget, today);
}

export async function updatePerformanceIndex(
  ctx: ToolContext,
  mediaBuyId: string,
  packagePerformance: PackagePerformance[]
): Promise<boolean> {
  const principal = ctx.principal ? toPrincipal(ctx.principal) : { principal_id: ctx.principalId ?? "", name: "anonymous", platform_mappings: {} };
  const adapter = await getAdapter(ctx.tenantId, principal, false);
  return adapter.update_media_buy_performance_index(mediaBuyId, packagePerformance);
}

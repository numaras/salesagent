/**
 * Media buy application service: create, update, get delivery.
 * Uses repositories + adapter; tools call this service.
 */

import { and, eq } from "drizzle-orm";
import { getDb, withTransaction } from "../db/client.js";
import {
  getMediaBuyById,
  insertMediaBuy,
  insertMediaPackages,
  listPackagesByMediaBuy,
} from "../db/repositories/media-buy.js";
import { listPricingOptionsByProduct } from "../db/repositories/product.js";
import { getAdapter, ensurePrincipal } from "../core/adapterRegistry.js";
import type { ToolContext } from "../core/auth/types.js";
import { DEFAULT_CURRENCY, MEDIA_BUY_STATUS } from "../core/constants.js";
import { creatives, currencyLimits } from "../db/schema.js";
import type {
  CreateMediaBuyRequest,
  CreateMediaBuyResponse,
  MediaPackage,
  ReportingPeriod,
  AdapterGetMediaBuyDeliveryResponse,
  UpdateMediaBuyResponse,
  PackagePerformance,
} from "../types/adcp.js";
import { ValidationError } from "../core/errors.js";

function normalizedCurrency(currency: string): string {
  return currency.trim().toUpperCase();
}

function parseOptionalAmount(raw: string | null): number | null {
  if (raw == null) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

async function getCurrencyGuardrails(
  db: ReturnType<typeof getDb>,
  tenantId: string,
  currency: string
): Promise<{ minPackageBudget: number | null; maxDailyPackageSpend: number | null }> {
  const rows = await db
    .select({
      minPackageBudget: currencyLimits.minPackageBudget,
      maxDailyPackageSpend: currencyLimits.maxDailyPackageSpend,
    })
    .from(currencyLimits)
    .where(and(eq(currencyLimits.tenantId, tenantId), eq(currencyLimits.currencyCode, currency)))
    .limit(1);

  const row = rows[0];
  if (!row) {
    throw new ValidationError(`Unsupported currency '${currency}' for tenant`);
  }

  return {
    minPackageBudget: parseOptionalAmount(row.minPackageBudget),
    maxDailyPackageSpend: parseOptionalAmount(row.maxDailyPackageSpend),
  };
}

async function getProductMinSpend(
  db: ReturnType<typeof getDb>,
  tenantId: string,
  productId: string | undefined,
  currency: string
): Promise<number | null> {
  if (!productId) return null;
  const pricing = await listPricingOptionsByProduct(db, tenantId, productId);
  const matched =
    pricing.find((p) => p.currency === currency && p.minSpendPerPackage != null) ??
    pricing.find((p) => p.minSpendPerPackage != null);
  return matched?.minSpendPerPackage != null ? Number(matched.minSpendPerPackage) : null;
}

async function assertCreativeIdsApproved(
  db: ReturnType<typeof getDb>,
  tenantId: string,
  creativeIds: string[]
): Promise<void> {
  for (const creativeId of creativeIds) {
    const rows = await db
      .select({ status: creatives.status })
      .from(creatives)
      .where(and(eq(creatives.tenantId, tenantId), eq(creatives.creativeId, creativeId)))
      .limit(1);
    const creative = rows[0];
    if (!creative) {
      throw new ValidationError(`Creative '${creativeId}' does not exist`);
    }
    if (creative.status !== "approved") {
      throw new ValidationError(`Creative '${creativeId}' is not approved`);
    }
  }
}

async function validatePackagesForCreate(
  ctx: ToolContext,
  request: CreateMediaBuyRequest,
  packages: MediaPackage[],
  totalBudget: number,
  currency: string
): Promise<void> {
  const db = getDb();
  const rules = await getCurrencyGuardrails(db, ctx.tenantId, currency);
  const defaultProductId = request.product_ids[0];

  for (const pkg of packages) {
    const packageBudget = pkg.budget ?? 0;
    if (!Number.isFinite(packageBudget) || packageBudget <= 0) {
      throw new ValidationError(`Package '${pkg.package_id}' budget must be greater than 0`);
    }

    if (rules.maxDailyPackageSpend != null && packageBudget > rules.maxDailyPackageSpend) {
      throw new ValidationError(
        `Package '${pkg.package_id}' budget exceeds max allowed (${rules.maxDailyPackageSpend} ${currency})`
      );
    }

    const productMinSpend = await getProductMinSpend(
      db,
      ctx.tenantId,
      pkg.product_id ?? defaultProductId,
      currency
    );
    const requiredMin = Math.max(rules.minPackageBudget ?? 0, productMinSpend ?? 0);
    if (requiredMin > 0 && packageBudget < requiredMin) {
      throw new ValidationError(
        `Package '${pkg.package_id}' budget is below minimum allowed (${requiredMin} ${currency})`
      );
    }

    if (Array.isArray(pkg.creative_ids) && pkg.creative_ids.length > 0) {
      await assertCreativeIdsApproved(db, ctx.tenantId, pkg.creative_ids);
    }
  }

  if (!Number.isFinite(totalBudget) || totalBudget <= 0) {
    throw new ValidationError("Total budget must be greater than 0");
  }

  if (rules.maxDailyPackageSpend != null) {
    const totalMax = rules.maxDailyPackageSpend * packages.length;
    if (totalBudget > totalMax) {
      throw new ValidationError(`Total budget exceeds allowed guardrail (${totalMax} ${currency})`);
    }
  }
}

async function validatePackageBudgetUpdate(
  ctx: ToolContext,
  mediaBuyId: string,
  packageId: string,
  budget: number
): Promise<void> {
  const db = getDb();
  const mediaBuy = await getMediaBuyById(db, mediaBuyId);
  if (!mediaBuy || mediaBuy.tenantId !== ctx.tenantId) {
    throw new ValidationError(`Unknown media buy '${mediaBuyId}'`);
  }

  const currency = normalizedCurrency(mediaBuy.currency ?? DEFAULT_CURRENCY);
  const rules = await getCurrencyGuardrails(db, ctx.tenantId, currency);
  const packages = await listPackagesByMediaBuy(db, mediaBuyId);
  const pkg = packages.find((p) => p.packageId === packageId);
  if (!pkg) {
    throw new ValidationError(`Unknown package '${packageId}' for media buy '${mediaBuyId}'`);
  }

  if (!Number.isFinite(budget) || budget <= 0) {
    throw new ValidationError("Package budget must be greater than 0");
  }
  if (rules.maxDailyPackageSpend != null && budget > rules.maxDailyPackageSpend) {
    throw new ValidationError(
      `Package '${packageId}' budget exceeds max allowed (${rules.maxDailyPackageSpend} ${currency})`
    );
  }

  const packageConfig = (pkg.packageConfig ?? {}) as Record<string, unknown>;
  const productId =
    typeof packageConfig.product_id === "string" ? packageConfig.product_id : undefined;
  const productMinSpend = await getProductMinSpend(db, ctx.tenantId, productId, currency);
  const requiredMin = Math.max(rules.minPackageBudget ?? 0, productMinSpend ?? 0);
  if (requiredMin > 0 && budget < requiredMin) {
    throw new ValidationError(
      `Package '${packageId}' budget is below minimum allowed (${requiredMin} ${currency})`
    );
  }
}

export async function createMediaBuy(
  ctx: ToolContext,
  request: CreateMediaBuyRequest,
  startDate: Date,
  endDate: Date
): Promise<CreateMediaBuyResponse> {
  const principal = ensurePrincipal(ctx);
  const adapter = await getAdapter(ctx.tenantId, principal, false);

  const productIds = request.product_ids ?? [];
  if (productIds.length === 0) throw new ValidationError("product_ids required");

  const packages: MediaPackage[] = (request.packages as MediaPackage[]) ?? [];
  if (packages.length === 0) throw new ValidationError("at least one package required");

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
    : DEFAULT_CURRENCY;
  const normalized = normalizedCurrency(currency);

  await validatePackagesForCreate(ctx, request, packages, budget, normalized);

  const adapterResponse = await adapter.create_media_buy(request, packages, startDate, endDate);

  if (adapterResponse.status === "error") return adapterResponse;

  await withTransaction(async (tx) => {
    await insertMediaBuy(tx, {
      mediaBuyId,
      tenantId: ctx.tenantId,
      principalId: ctx.principalId ?? "",
      buyerRef: buyerRef ?? undefined,
      orderName,
      advertiserName,
      budget: String(budget),
      currency: normalized,
      startDate: startDate.toISOString().slice(0, 10),
      endDate: endDate.toISOString().slice(0, 10),
      status: MEDIA_BUY_STATUS.DRAFT,
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
  if (!row || row.tenantId !== ctx.tenantId) return { media_buy_id: mediaBuyId };
  const principal = ensurePrincipal(ctx);
  const adapter = await getAdapter(ctx.tenantId, principal, false);
  return adapter.get_media_buy_delivery(mediaBuyId, dateRange, new Date());
}

export async function updateMediaBuy(
  ctx: ToolContext,
  mediaBuyId: string,
  buyerRef: string,
  action: string,
  packageId: string | null,
  budget: number | null
): Promise<UpdateMediaBuyResponse> {
  if (budget != null && !packageId) {
    throw new ValidationError("package_id is required when updating a package budget");
  }
  if (budget != null && packageId) {
    await validatePackageBudgetUpdate(ctx, mediaBuyId, packageId, budget);
  }
  const principal = ensurePrincipal(ctx);
  const adapter = await getAdapter(ctx.tenantId, principal, false);
  return adapter.update_media_buy(mediaBuyId, buyerRef, action, packageId, budget, new Date());
}

export async function updatePerformanceIndex(
  ctx: ToolContext,
  mediaBuyId: string,
  packagePerformance: PackagePerformance[]
): Promise<boolean> {
  const principal = ensurePrincipal(ctx);
  const adapter = await getAdapter(ctx.tenantId, principal, false);
  return adapter.update_media_buy_performance_index(mediaBuyId, packagePerformance);
}

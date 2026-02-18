/**
 * Google Ad Manager adapter implementing AdServerAdapter.
 * Port of python_src/src/adapters/google_ad_manager.py (minimal Batch 4 scope).
 */

import type {
  AdapterGetMediaBuyDeliveryResponse,
  AssetStatus,
  CheckMediaBuyStatusResponse,
  CreateMediaBuyRequest,
  CreateMediaBuyResponse,
  MediaPackage,
  PackagePerformance,
  Principal,
  ReportingPeriod,
  UpdateMediaBuyResponse,
} from "../../types/adcp.js";
import type { AdServerAdapter, TargetingCapabilities } from "../base.js";
import type { GamClientWrapper } from "./client.js";
import { createOrderWithLineItems } from "./orders.js";
import type { GamConfig } from "./types.js";
import type { PricingModel } from "./pricingCompatibility.js";

const SUPPORTED_PRICING = new Set<string>(["cpm", "vcpm", "cpc", "flat_rate"]);

const GAM_TARGETING_CAPABILITIES: TargetingCapabilities = {
  geo_countries: true,
  geo_regions: true,
  nielsen_dma: true,
  us_zip: true,
};

function inferPricingModel(
  packagePricingInfo?: Record<string, Record<string, unknown>>,
  packageId?: string
): PricingModel {
  if (packagePricingInfo && packageId) {
    const info = packagePricingInfo[packageId];
    const model = info?.pricing_model ?? info?.pricingModel;
    if (typeof model === "string" && SUPPORTED_PRICING.has(model)) return model as PricingModel;
  }
  return "cpm";
}

export class GoogleAdManager implements AdServerAdapter {
  readonly config: GamConfig;
  readonly principal: Principal;
  readonly dryRun: boolean;
  private readonly clientWrapper: GamClientWrapper | null;

  constructor(
    config: GamConfig,
    principal: Principal,
    clientWrapper?: GamClientWrapper | null
  ) {
    this.config = config;
    this.principal = principal;
    this.dryRun = config.dryRun ?? false;
    this.clientWrapper = clientWrapper ?? null;

    if (!config.networkCode) {
      throw new Error("GAM config requires networkCode");
    }
    const adv = config.advertiserId;
    if (adv != null && adv !== "") {
      const n = parseInt(adv, 10);
      if (Number.isNaN(n)) {
        throw new Error(
          "GAM advertiser_id must be numeric. Check principal platform_mappings."
        );
      }
    }
  }

  get_supported_pricing_models(): Set<string> {
    return new Set(SUPPORTED_PRICING);
  }

  get_targeting_capabilities(): TargetingCapabilities {
    return { ...GAM_TARGETING_CAPABILITIES };
  }

  async create_media_buy(
    request: CreateMediaBuyRequest,
    packages: MediaPackage[],
    startTime: Date,
    endTime: Date,
    packagePricingInfo?: Record<string, Record<string, unknown>>
  ): Promise<CreateMediaBuyResponse> {
    const buyerRef = (request as Record<string, unknown>).buyer_ref as string | undefined;
    const poNumber = (request as Record<string, unknown>).po_number as string | undefined;

    if (this.dryRun) {
      const fakeId = `gam_dry_${Date.now()}`;
      return { status: "success", media_buy_id: fakeId, buyer_ref: buyerRef ?? "unknown" };
    }

    if (!this.clientWrapper) {
      return {
        status: "error",
        error: "GAM client not configured",
        detail: "Cannot create media buy without client (missing credentials or wrapper).",
      };
    }

    const advId = this.config.advertiserId;
    const traffId = this.config.traffickerId;
    if (advId == null || advId === "" || traffId == null || traffId === "") {
      return {
        status: "error",
        error: "Order creation requires advertiserId and traffickerId",
        detail: "Set principal platform_mappings and adapter config.",
      };
    }

    if (packages.length === 0) {
      return { status: "error", error: "At least one package is required" };
    }

    const pkg = packages[0];
    const pricingModel = inferPricingModel(packagePricingInfo, pkg.package_id);
    const isGuaranteed = pkg.delivery_type === "guaranteed";
    const orderName = poNumber ? `Order ${poNumber}` : `Order ${pkg.name?.slice(0, 50) ?? "AdCP"}`;

    try {
      const orderId = await createOrderWithLineItems(this.clientWrapper, {
        advertiserId: advId,
        traffickerId: traffId,
        orderName,
        buyerRef,
        poNumber: poNumber ?? undefined,
        startTime,
        endTime,
        currency: "USD",
        packageName: pkg.name ?? pkg.package_id,
        packageCpm: pkg.cpm,
        packageImpressions: pkg.impressions,
        isGuaranteed,
        pricingModel,
      });
      return {
        status: "success",
        media_buy_id: orderId,
        buyer_ref: buyerRef ?? "unknown",
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { status: "error", error: "GAM create_media_buy failed", detail: message };
    }
  }

  add_creative_assets(
    _mediaBuyId: string,
    _assets: Record<string, unknown>[],
    _today: Date
  ): AssetStatus[] {
    return [];
  }

  associate_creatives(
    _lineItemIds: string[],
    _platformCreativeIds: string[]
  ): Record<string, unknown>[] {
    return [];
  }

  check_media_buy_status(_mediaBuyId: string, _today: Date): CheckMediaBuyStatusResponse {
    return { status: "UNKNOWN" };
  }

  get_media_buy_delivery(
    mediaBuyId: string,
    _dateRange: ReportingPeriod,
    _today: Date
  ): AdapterGetMediaBuyDeliveryResponse {
    return { media_buy_id: mediaBuyId };
  }

  update_media_buy_performance_index(
    _mediaBuyId: string,
    _packagePerformance: PackagePerformance[]
  ): boolean {
    return true;
  }

  update_media_buy(
    _mediaBuyId: string,
    _buyerRef: string,
    _action: string,
    _packageId: string | null,
    _budget: number | null,
    _today: Date
  ): UpdateMediaBuyResponse {
    return { status: "success" };
  }
}

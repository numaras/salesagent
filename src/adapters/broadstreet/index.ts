/**
 * Broadstreet ad server adapter.
 * Supports CPM and flat_rate pricing; geo_countries, geo_regions, and nielsen_dma targeting.
 */

import type {
  AdapterGetMediaBuyDeliveryResponse,
  AssetStatus,
  CheckMediaBuyStatusResponse,
  CreateMediaBuyRequest,
  CreateMediaBuyResponse,
  CreateMediaBuySuccessResponse,
  MediaPackage,
  PackagePerformance,
  Principal,
  ReportingPeriod,
  UpdateMediaBuyResponse,
} from "../../types/adcp.js";
import type { AdapterCapabilities, AdServerAdapter, TargetingCapabilities } from "../base.js";

export const BROADSTREET_CAPABILITIES: AdapterCapabilities = {
  supports_inventory_sync: false,
  supports_inventory_profiles: false,
  inventory_entity_label: "Broadstreet Campaigns",
  supports_custom_targeting: false,
  supports_geo_targeting: true,
  supports_dynamic_products: false,
  supported_pricing_models: ["cpm", "flat_rate"],
  supports_webhooks: false,
  supports_realtime_reporting: false,
};

export interface BroadstreetConfig {
  networkId: string;
  apiKey: string;
}

export class BroadstreetAdapter implements AdServerAdapter {
  readonly config: BroadstreetConfig;
  readonly principal: Principal;
  readonly capabilities = BROADSTREET_CAPABILITIES;

  constructor(config: BroadstreetConfig, principal: Principal) {
    this.config = config;
    this.principal = principal;
  }

  get_supported_pricing_models(): Set<string> {
    return new Set(["cpm", "flat_rate"]);
  }

  get_targeting_capabilities(): TargetingCapabilities {
    return {
      geo_countries: true,
      geo_regions: true,
      nielsen_dma: true,
    };
  }

  create_media_buy(
    request: CreateMediaBuyRequest,
    _packages: MediaPackage[],
    _startTime: Date,
    _endTime: Date,
    _packagePricingInfo?: Record<string, Record<string, unknown>>
  ): CreateMediaBuyResponse {
    const buyerRef = (request as Record<string, unknown>).buyer_ref as string | undefined;
    const mediaBuyId = `bstreet_${crypto.randomUUID().slice(0, 8)}`;

    const success: CreateMediaBuySuccessResponse = {
      status: "success",
      media_buy_id: mediaBuyId,
      buyer_ref: buyerRef ?? "unknown",
    };
    return success;
  }

  add_creative_assets(
    _mediaBuyId: string,
    assets: Record<string, unknown>[],
    _today: Date
  ): AssetStatus[] {
    return assets.map((_, i) => ({
      status: "active",
      creative_id: `bstreet_cr_${i}`,
    }));
  }

  associate_creatives(
    lineItemIds: string[],
    platformCreativeIds: string[]
  ): Record<string, unknown>[] {
    return lineItemIds.flatMap((lid) =>
      platformCreativeIds.map((cid) => ({
        line_item_id: lid,
        creative_id: cid,
        status: "success",
      }))
    );
  }

  check_media_buy_status(_mediaBuyId: string, _today: Date): CheckMediaBuyStatusResponse {
    return { status: "active" };
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

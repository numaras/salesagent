/**
 * Kevel ad server adapter.
 * Supports CPM and CPC pricing; geo_countries and geo_regions targeting.
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

export const KEVEL_CAPABILITIES: AdapterCapabilities = {
  supports_inventory_sync: false,
  supports_inventory_profiles: false,
  inventory_entity_label: "Kevel Flights",
  supports_custom_targeting: false,
  supports_geo_targeting: true,
  supports_dynamic_products: false,
  supported_pricing_models: ["cpm", "cpc"],
  supports_webhooks: false,
  supports_realtime_reporting: false,
};

export interface KevelConfig {
  networkId: string;
  apiKey: string;
  manualApprovalRequired?: boolean;
}

export class KevelAdapter implements AdServerAdapter {
  readonly config: KevelConfig;
  readonly principal: Principal;
  readonly capabilities = KEVEL_CAPABILITIES;

  constructor(config: KevelConfig, principal: Principal) {
    this.config = config;
    this.principal = principal;
  }

  get_supported_pricing_models(): Set<string> {
    return new Set(["cpm", "cpc"]);
  }

  get_targeting_capabilities(): TargetingCapabilities {
    return {
      geo_countries: true,
      geo_regions: true,
    };
  }

  async create_media_buy(
    request: CreateMediaBuyRequest,
    packages: MediaPackage[],
    _startTime: Date,
    _endTime: Date,
    _packagePricingInfo?: Record<string, Record<string, unknown>>
  ): Promise<CreateMediaBuyResponse> {
    const buyerRef = (request as Record<string, unknown>).buyer_ref as string | undefined;
    const mediaBuyId = `kevel_${crypto.randomUUID().slice(0, 8)}`;

    // TODO: POST to Kevel Campaign API
    // const url = `https://api.kevel.co/v1/flight`;
    // const body = { networkId: this.config.networkId, packages, ... };
    // const response = await fetch(url, {
    //   method: "POST",
    //   headers: { "X-Kevel-ApiKey": this.config.apiKey, "Content-Type": "application/json" },
    //   body: JSON.stringify(body),
    // });

    void packages;

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
      creative_id: `kevel_cr_${i}`,
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

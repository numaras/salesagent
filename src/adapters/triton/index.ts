/**
 * Triton Digital ad server adapter.
 * Supports CPM and flat_rate pricing; geo_countries targeting.
 */

import { AdapterError } from "../../core/errors.js";
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

export const TRITON_CAPABILITIES: AdapterCapabilities = {
  supports_inventory_sync: false,
  supports_inventory_profiles: false,
  inventory_entity_label: "Triton Campaigns",
  supports_custom_targeting: false,
  supports_geo_targeting: true,
  supports_dynamic_products: false,
  supported_pricing_models: ["cpm", "flat_rate"],
  supports_webhooks: false,
  supports_realtime_reporting: false,
};

export interface TritonDigitalConfig {
  stationId: string;
  apiKey: string;
}

export class TritonDigitalAdapter implements AdServerAdapter {
  readonly config: TritonDigitalConfig;
  readonly principal: Principal;
  readonly capabilities = TRITON_CAPABILITIES;
  readonly dryRun: boolean;

  constructor(config: TritonDigitalConfig, principal: Principal, dryRun: boolean = false) {
    this.config = config;
    this.principal = principal;
    this.dryRun = dryRun;
  }

  private getHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.config.apiKey}`,
      "Content-Type": "application/json",
    };
  }

  get_supported_pricing_models(): Set<string> {
    return new Set(["cpm", "flat_rate"]);
  }

  get_targeting_capabilities(): TargetingCapabilities {
    return {
      geo_countries: true,
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

    if (this.dryRun) {
      const success: CreateMediaBuySuccessResponse = {
        status: "success",
        media_buy_id: `triton_${crypto.randomUUID().slice(0, 8)}`,
        buyer_ref: buyerRef ?? "unknown",
      };
      return success;
    }

    const tritonMapping = this.principal.platform_mappings.triton as Record<string, unknown> | undefined;
    const advertiserId = tritonMapping?.advertiser_id as string | undefined;

    if (!advertiserId) {
      throw new AdapterError("Missing advertiser_id in platform_mappings.triton", "triton");
    }

    // 1. Create Campaign
    const campaignPayload = {
      Name: buyerRef ?? `Campaign ${new Date().toISOString()}`,
      AdvertiserId: advertiserId,
    };

    const campaignRes = await fetch("https://tap-api.tritondigital.com/v1/campaigns", {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(campaignPayload),
    });

    if (!campaignRes.ok) {
      throw new AdapterError(`Failed to create Triton campaign: ${await campaignRes.text()}`, "triton");
    }

    const campaignData = (await campaignRes.json()) as { Id: string | number };
    const campaignId = String(campaignData.Id);

    // 2. Create Flights (packages)
    for (const pkg of packages) {
      const flightPayload = {
        Name: pkg.name,
        PricingModel: pkg.cpm ? "CPM" : "FLAT_RATE",
        Impressions: pkg.impressions,
        Rate: pkg.cpm || 0,
        Targeting: pkg.targeting_overlay ? { GeoCountries: (pkg.targeting_overlay as Record<string, unknown>).geo_countries } : undefined,
      };

      const flightRes = await fetch(`https://tap-api.tritondigital.com/v1/flights/campaign/${campaignId}`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify(flightPayload),
      });

      if (!flightRes.ok) {
        throw new AdapterError(`Failed to create Triton flight for package ${pkg.package_id}: ${await flightRes.text()}`, "triton");
      }
    }

    const success: CreateMediaBuySuccessResponse = {
      status: "success",
      media_buy_id: campaignId,
      buyer_ref: buyerRef ?? "unknown",
    };
    return success;
  }

  async add_creative_assets(
    _mediaBuyId: string,
    assets: Record<string, unknown>[],
    _today: Date
  ): Promise<AssetStatus[]> {
    if (this.dryRun) {
      return assets.map((_, i) => ({
        status: "active",
        creative_id: `triton_cr_${i}`,
      }));
    }

    const statuses: AssetStatus[] = [];
    for (const [i, asset] of assets.entries()) {
      const creativePayload = {
        Name: asset.name ?? `Creative ${i}`,
        Url: asset.url ?? asset.asset_url,
      };

      const res = await fetch("https://tap-api.tritondigital.com/v1/creatives", {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify(creativePayload),
      });

      if (!res.ok) {
        throw new AdapterError(`Failed to create Triton creative: ${await res.text()}`, "triton");
      }

      const creativeData = (await res.json()) as { Id: string | number };
      statuses.push({
        status: "active",
        creative_id: String(creativeData.Id),
      });
    }

    return statuses;
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

  async get_media_buy_delivery(
    mediaBuyId: string,
    dateRange: ReportingPeriod,
    _today: Date
  ): Promise<AdapterGetMediaBuyDeliveryResponse> {
    if (this.dryRun) {
      return { media_buy_id: mediaBuyId };
    }

    const reportPayload = {
      CampaignId: mediaBuyId,
      StartDate: dateRange.start_date,
      EndDate: dateRange.end_date,
      Metrics: ["Impressions", "Spend"],
    };

    const res = await fetch("https://tap-api.tritondigital.com/v1/reports", {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(reportPayload),
    });

    if (!res.ok) {
      throw new AdapterError(`Failed to fetch Triton reporting: ${await res.text()}`, "triton");
    }

    const reportData = (await res.json()) as { Impressions?: number; Spend?: number };

    return {
      media_buy_id: mediaBuyId,
      impressions: reportData.Impressions ?? 0,
      spend: reportData.Spend ?? 0,
    };
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

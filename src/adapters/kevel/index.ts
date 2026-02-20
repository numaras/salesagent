/**
 * Kevel ad server adapter.
 * Supports CPM and CPC pricing; geo_countries and geo_regions targeting.
 */

import { AdapterError } from "../../core/errors.js";
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
  readonly dryRun: boolean;

  constructor(config: KevelConfig, principal: Principal, dryRun: boolean = false) {
    this.config = config;
    this.principal = principal;
    this.dryRun = dryRun;
  }

  private getHeaders(): HeadersInit {
    return {
      "X-Kevel-ApiKey": this.config.apiKey,
      "Content-Type": "application/json",
    };
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
    
    if (this.dryRun) {
      return {
        status: "success",
        media_buy_id: `kevel_dryrun_${crypto.randomUUID().slice(0, 8)}`,
        buyer_ref: buyerRef ?? "unknown",
      };
    }

    const orderName = (request.context?.order_name as string) || `MediaBuy_${Date.now()}`;
    
    let advertiserId: number;
    try {
      const kevelMappings = this.principal.platform_mappings?.kevel as Record<string, unknown> | undefined;
      advertiserId = Number(kevelMappings?.advertiser_id);
      if (isNaN(advertiserId) || advertiserId === 0) throw new Error("Invalid Advertiser ID");
    } catch {
      throw new AdapterError("Missing or invalid Kevel advertiser_id in platform mappings", "kevel");
    }

    let campaignId: number;
    try {
      const campResponse = await fetch("https://api.kevel.co/v1/campaigns", {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({
          Name: orderName,
          AdvertiserId: advertiserId,
          IsActive: true,
        }),
      });

      if (!campResponse.ok) {
        throw new Error(`Kevel API returned ${campResponse.status} ${campResponse.statusText}`);
      }
      
      const campData = await campResponse.json() as { Id: number };
      campaignId = campData.Id;
    } catch (e) {
      throw new AdapterError(`Failed to create Kevel campaign: ${e instanceof Error ? e.message : String(e)}`, "kevel");
    }

    try {
      for (const pkg of packages) {
        const flightBody: Record<string, unknown> = {
          Name: pkg.name || `Flight_${pkg.package_id}`,
          CampaignId: campaignId,
          IsActive: true,
          Price: pkg.cpm || 0,
          Goal: { GoalType: 1, Percentage: 0, Amount: pkg.impressions || 0 }, // 1 = Impressions
          RateType: pkg.cpm ? 2 : 3, // 2 = CPM, 3 = CPC
        };

        if (pkg.targeting_overlay) {
          const t = pkg.targeting_overlay as Record<string, unknown>;
          const geoTargeting: Array<Record<string, unknown>> = [];
          
          if (Array.isArray(t.geo_countries)) {
            for (const c of t.geo_countries) {
               geoTargeting.push({ CountryCode: c });
            }
          }
          if (Array.isArray(t.geo_regions)) {
            for (const r of t.geo_regions) {
               geoTargeting.push({ RegionCode: r });
            }
          }
          if (geoTargeting.length > 0) {
            flightBody.GeoTargeting = geoTargeting;
          }
        }

        const flightResponse = await fetch(`https://api.kevel.co/v1/flights/campaign/${campaignId}`, {
          method: "POST",
          headers: this.getHeaders(),
          body: JSON.stringify(flightBody),
        });

        if (!flightResponse.ok) {
          throw new Error(`Kevel API returned ${flightResponse.status} ${flightResponse.statusText} for flight ${pkg.package_id}`);
        }
      }
    } catch (e) {
      throw new AdapterError(`Failed to create Kevel flights: ${e instanceof Error ? e.message : String(e)}`, "kevel");
    }

    return {
      status: "success",
      media_buy_id: `kevel_${campaignId}`,
      buyer_ref: buyerRef ?? "unknown",
    };
  }

  async add_creative_assets(
    _mediaBuyId: string,
    assets: Record<string, unknown>[],
    _today: Date
  ): Promise<AssetStatus[]> {
    if (this.dryRun) {
      return assets.map((_, i) => ({
        status: "active",
        creative_id: `kevel_cr_dryrun_${i}`,
      }));
    }

    const results: AssetStatus[] = [];
    const kevelMappings = this.principal.platform_mappings?.kevel as Record<string, unknown> | undefined;
    const advertiserId = Number(kevelMappings?.advertiser_id);

    for (const asset of assets) {
       try {
         const creativeBody = {
           AdvertiserId: advertiserId || 0,
           Title: asset.name || `Creative_${crypto.randomUUID().slice(0, 8)}`,
           Body: asset.body || "",
           Url: asset.click_url || "https://example.com",
           FormatId: asset.format_id || 1, // fallback default
         };
         
         const response = await fetch("https://api.kevel.co/v1/creatives", {
           method: "POST",
           headers: this.getHeaders(),
           body: JSON.stringify(creativeBody),
         });

         if (!response.ok) {
           throw new Error(`HTTP ${response.status} ${response.statusText}`);
         }
         
         const data = await response.json() as { Id: number };
         results.push({
           status: "active",
           creative_id: `kevel_${data.Id}`,
         });
       } catch (e) {
         results.push({
           status: "error",
           message: e instanceof Error ? e.message : String(e),
         });
       }
    }
    return results;
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
      return { 
        media_buy_id: mediaBuyId,
        delivery: { impressions: 1000, spend: 10.0 }
      };
    }

    try {
      const campaignIdMatch = mediaBuyId.match(/kevel_(\d+)/);
      const campaignId = campaignIdMatch ? Number(campaignIdMatch[1]) : 0;

      const reportBody = {
        StartDate: dateRange.start_date,
        EndDate: dateRange.end_date,
        CampaignIds: campaignId ? [campaignId] : [],
      };

      const response = await fetch("https://api.kevel.co/v1/report", {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify(reportBody),
      });

      if (!response.ok) {
         throw new Error(`Kevel reporting API returned ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as { Records?: Array<{ Impressions?: number; Revenue?: number }> };
      let impressions = 0;
      let spend = 0;

      if (data.Records && Array.isArray(data.Records)) {
         for (const record of data.Records) {
           impressions += record.Impressions || 0;
           spend += record.Revenue || 0;
         }
      }

      return {
        media_buy_id: mediaBuyId,
        delivery: {
          impressions,
          spend,
        },
      };
    } catch (e) {
      throw new AdapterError(`Failed to fetch delivery from Kevel: ${e instanceof Error ? e.message : String(e)}`, "kevel");
    }
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

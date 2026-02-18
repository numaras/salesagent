/**
 * Mock ad server adapter (ported from python_src/src/adapters/mock_ad_server.py).
 * Simulates media buy lifecycle for testing; supports all pricing models and targeting.
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

/** Default channels supported by mock (display, olv, streaming_audio, social). */
export const DEFAULT_CHANNELS = ["display", "olv", "streaming_audio", "social"];

/** Full targeting capabilities for testing. */
function fullTargetingCapabilities(): TargetingCapabilities {
  return {
    geo_countries: true,
    geo_regions: true,
    nielsen_dma: true,
    eurostat_nuts2: true,
    uk_itl1: true,
    uk_itl2: true,
    us_zip: true,
    us_zip_plus_four: true,
    ca_fsa: true,
    ca_full: true,
    gb_outward: true,
    gb_full: true,
    de_plz: true,
    fr_code_postal: true,
    au_postcode: true,
  };
}

/** Mock adapter capabilities (all pricing models). */
export const MOCK_CAPABILITIES: AdapterCapabilities = {
  supports_inventory_sync: false,
  supports_inventory_profiles: false,
  inventory_entity_label: "Mock Items",
  supports_custom_targeting: false,
  supports_geo_targeting: true,
  supports_dynamic_products: false,
  supported_pricing_models: ["cpm", "vcpm", "cpcv", "cpp", "cpc", "cpv", "flat_rate"],
  supports_webhooks: false,
  supports_realtime_reporting: false,
};

export interface MockAdServerConfig {
  manual_approval_required?: boolean;
  dry_run?: boolean;
}

/**
 * Mock ad server adapter implementing AdServerAdapter.
 */
export class MockAdServer implements AdServerAdapter {
  readonly config: MockAdServerConfig;
  readonly principal: Principal;
  readonly dryRun: boolean;
  readonly capabilities = MOCK_CAPABILITIES;
  readonly defaultChannels = DEFAULT_CHANNELS;

  /** In-memory media buys (media_buy_id -> state). */
  readonly _mediaBuys: Map<string, Record<string, unknown>> = new Map();

  constructor(
    config: MockAdServerConfig,
    principal: Principal,
    dryRun: boolean = false
  ) {
    this.config = config ?? {};
    this.principal = principal;
    this.dryRun = dryRun;
  }

  get_supported_pricing_models(): Set<string> {
    return new Set([
      "cpm",
      "vcpm",
      "cpcv",
      "cpp",
      "cpc",
      "cpv",
      "flat_rate",
    ]);
  }

  get_targeting_capabilities(): TargetingCapabilities {
    return fullTargetingCapabilities();
  }

  create_media_buy(
    request: CreateMediaBuyRequest,
    packages: MediaPackage[],
    _startTime: Date,
    _endTime: Date,
    _packagePricingInfo?: Record<string, Record<string, unknown>>
  ): CreateMediaBuyResponse {
    const poNumber = (request as Record<string, unknown>).po_number as string | undefined;
    const buyerRef = (request as Record<string, unknown>).buyer_ref as string | undefined;
    const mediaBuyId = poNumber ? `buy_${poNumber}` : `buy_${crypto.randomUUID().slice(0, 8)}`;

    if (!this.dryRun) {
      const totalBudget = packages.reduce((sum, p) => sum + (p.budget ?? 0), 0);
      this._mediaBuys.set(mediaBuyId, {
        id: mediaBuyId,
        buyer_ref: buyerRef ?? "unknown",
        total_budget: totalBudget,
        packages: packages.map((p) => ({
          package_id: p.package_id,
          name: p.name,
          cpm: p.cpm,
          impressions: p.impressions,
        })),
      });
    }

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
      creative_id: `mock_cr_${i}`,
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
    const state = this._mediaBuys.get(mediaBuyId);
    return {
      media_buy_id: mediaBuyId,
      delivery: state ? { impressions: 0, spend: 0 } : undefined,
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

/** Get adapter-specific principal ID for mock (from platform_mappings). */
export function getMockAdapterPrincipalId(principal: Principal): string | undefined {
  const mockMapping = principal.platform_mappings["mock"];
  if (mockMapping && typeof mockMapping === "object" && "advertiser_id" in mockMapping) {
    return String((mockMapping as Record<string, unknown>).advertiser_id);
  }
  return undefined;
}

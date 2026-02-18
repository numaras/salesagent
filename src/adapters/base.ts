/**
 * Adapter interface and capability types.
 * Ported from python_src/src/adapters/base.py
 */

import type {
  AdapterGetMediaBuyDeliveryResponse,
  AssetStatus,
  CheckMediaBuyStatusResponse,
  CreateMediaBuyRequest,
  CreateMediaBuyResponse,
  MediaPackage,
  PackagePerformance,
  ReportingPeriod,
  UpdateMediaBuyResponse,
} from "../types/adcp.js";

/** Targeting capabilities supported by an adapter (AdCP GetAdcpCapabilitiesResponse.media_buy.execution.targeting). */
export interface TargetingCapabilities {
  geo_countries?: boolean;
  geo_regions?: boolean;
  nielsen_dma?: boolean;
  eurostat_nuts2?: boolean;
  uk_itl1?: boolean;
  uk_itl2?: boolean;
  us_zip?: boolean;
  us_zip_plus_four?: boolean;
  ca_fsa?: boolean;
  ca_full?: boolean;
  gb_outward?: boolean;
  gb_full?: boolean;
  de_plz?: boolean;
  fr_code_postal?: boolean;
  au_postcode?: boolean;
}

/** UI and feature capabilities declared by an adapter. */
export interface AdapterCapabilities {
  supports_inventory_sync?: boolean;
  supports_inventory_profiles?: boolean;
  inventory_entity_label?: string;
  supports_custom_targeting?: boolean;
  supports_geo_targeting?: boolean;
  supports_dynamic_products?: boolean;
  supported_pricing_models?: string[] | null;
  supports_webhooks?: boolean;
  supports_realtime_reporting?: boolean;
}

/** Ad server adapter interface (mirrors Python AdServerAdapter). */
export interface AdServerAdapter {
  get_supported_pricing_models(): Set<string>;
  get_targeting_capabilities(): TargetingCapabilities;
  create_media_buy(
    request: CreateMediaBuyRequest,
    packages: MediaPackage[],
    startTime: Date,
    endTime: Date,
    packagePricingInfo?: Record<string, Record<string, unknown>>
  ): CreateMediaBuyResponse | Promise<CreateMediaBuyResponse>;
  add_creative_assets(
    mediaBuyId: string,
    assets: Record<string, unknown>[],
    today: Date
  ): AssetStatus[];
  associate_creatives(
    lineItemIds: string[],
    platformCreativeIds: string[]
  ): Record<string, unknown>[];
  check_media_buy_status(mediaBuyId: string, today: Date): CheckMediaBuyStatusResponse;
  get_media_buy_delivery(
    mediaBuyId: string,
    dateRange: ReportingPeriod,
    today: Date
  ): AdapterGetMediaBuyDeliveryResponse;
  update_media_buy_performance_index(
    mediaBuyId: string,
    packagePerformance: PackagePerformance[]
  ): boolean;
  update_media_buy(
    mediaBuyId: string,
    buyerRef: string,
    action: string,
    packageId: string | null,
    budget: number | null,
    today: Date
  ): UpdateMediaBuyResponse;
}

/**
 * AdCP-aligned TypeScript types (minimal subset for tools/adapters).
 * Mirrors JSON shapes from python_src/src/core/schemas.py and adcp library.
 * Used at API boundaries; extend as more modules are ported.
 */

/** AdCP format identifier (agent_url + id; optional width/height/duration per AdCP 2.5). */
export interface FormatId {
  agent_url: string;
  id: string;
  width?: number;
  height?: number;
  duration_ms?: number;
}

/** Principal: auth and adapter mapping (per python Principal). */
export interface Principal {
  principal_id: string;
  name: string;
  platform_mappings: Record<string, unknown>;
}

/** Budget (AdCP spec): total, currency, optional daily_cap and pacing. */
export interface Budget {
  total: number;
  currency: string;
  daily_cap?: number;
  pacing?: "even" | "asap" | "daily_budget";
  auto_pause_on_budget_exhaustion?: boolean;
}

/** Delivery type per AdCP. */
export type DeliveryType = "guaranteed" | "non_guaranteed";

/**
 * Minimal Product shape for adapter/tool use.
 * Full Product in Python extends library Product with many optional fields.
 */
export interface Product {
  product_id: string;
  name: string;
  description: string;
  format_ids: FormatId[];
  delivery_type: DeliveryType;
  delivery_measurement?: unknown;
  pricing_options?: unknown[];
  publisher_properties?: unknown;
  is_custom?: boolean;
  [key: string]: unknown;
}

/**
 * Media package (per python MediaPackage).
 */
export interface MediaPackage {
  package_id: string;
  name: string;
  delivery_type: DeliveryType;
  cpm: number;
  impressions: number;
  format_ids: FormatId[];
  targeting_overlay?: unknown;
  buyer_ref?: string;
  product_id?: string;
  budget?: number;
  creative_ids?: string[];
}

/**
 * CreateMediaBuyRequest minimal shape (for type-safe boundaries).
 * Full request has budget, packages, context, etc.
 */
export interface CreateMediaBuyRequest {
  product_ids: string[];
  budget?: Budget | number;
  packages?: unknown[];
  context?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * CreateMediaBuyResponse: success has media_buy_id; error has error/details.
 */
export interface CreateMediaBuySuccessResponse {
  status: "success";
  media_buy_id: string;
  buyer_ref?: string;
  [key: string]: unknown;
}

export interface CreateMediaBuyErrorResponse {
  status: "error";
  error: string;
  detail?: string;
  [key: string]: unknown;
}

export type CreateMediaBuyResponse = CreateMediaBuySuccessResponse | CreateMediaBuyErrorResponse;

/** Type guard: success response. */
export function isCreateMediaBuySuccess(
  r: CreateMediaBuyResponse
): r is CreateMediaBuySuccessResponse {
  return r.status === "success" && "media_buy_id" in r;
}

/** Type guard: error response. */
export function isCreateMediaBuyError(r: CreateMediaBuyResponse): r is CreateMediaBuyErrorResponse {
  return r.status === "error";
}

/** Asset status (per adapter add_creative_assets). */
export interface AssetStatus {
  asset_id?: string;
  creative_id?: string;
  status: string;
  message?: string;
}

/** Reporting period for delivery (start/end). */
export interface ReportingPeriod {
  start_date: string;
  end_date: string;
}

/** Check media buy status response (minimal). */
export interface CheckMediaBuyStatusResponse {
  status: string;
  [key: string]: unknown;
}

/** Adapter get media buy delivery response (minimal). */
export interface AdapterGetMediaBuyDeliveryResponse {
  media_buy_id: string;
  [key: string]: unknown;
}

/** Update media buy response: success or error. */
export interface UpdateMediaBuySuccessResponse {
  status: "success";
  [key: string]: unknown;
}
export interface UpdateMediaBuyErrorResponse {
  status: "error";
  error: string;
  [key: string]: unknown;
}
export type UpdateMediaBuyResponse = UpdateMediaBuySuccessResponse | UpdateMediaBuyErrorResponse;

/** Package performance (for update_media_buy_performance_index). */
export interface PackagePerformance {
  package_id: string;
  performance_index: number;
}

/** GetAdcpCapabilities response (minimal AdCP shape). */
export interface GetAdcpCapabilitiesResponse {
  adcp?: { supported_protocols?: string[]; major_version?: number };
  media_buy?: { execution?: { targeting?: Record<string, boolean> }; channels?: string[] };
  portfolio?: { publisher_domain?: string };
  [key: string]: unknown;
}

/** GetProducts response. */
export interface GetProductsResponse {
  products: Product[];
  [key: string]: unknown;
}

/** ListAuthorizedProperties response (minimal). */
export interface AuthorizedProperty {
  property_id: string;
  name?: string;
  domain?: string;
  [key: string]: unknown;
}
export interface ListAuthorizedPropertiesResponse {
  properties: AuthorizedProperty[];
  [key: string]: unknown;
}

/** ListCreativeFormats response (minimal). */
export interface CreativeFormatItem {
  format_id: FormatId;
  name?: string;
  width?: number;
  height?: number;
  duration_ms?: number;
}
export interface ListCreativeFormatsResponse {
  formats: CreativeFormatItem[];
  [key: string]: unknown;
}

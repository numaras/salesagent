/**
 * Convert DB product rows to AdCP Product format.
 * Ported from python_src product serialization logic.
 */

import type { ProductRow, PricingOptionRow } from "../db/repositories/product.js";
import type { Product, DeliveryType, FormatId } from "../types/adcp.js";

export interface AdcpPricingOption {
  pricing_model: string;
  rate: string | null;
  currency: string;
  is_fixed: boolean;
  price_guidance?: unknown;
  parameters?: unknown;
  min_spend_per_package?: string | null;
}

export interface AdcpProduct extends Product {
  targeting_template: unknown;
  measurement?: unknown;
  is_custom: boolean;
  implementation_config?: unknown;
  property_tags?: unknown;
  pricing_options: AdcpPricingOption[];
  pricing?: AdcpPricingOption;
}

function mapPricingOption(row: PricingOptionRow): AdcpPricingOption {
  return {
    pricing_model: row.pricingModel,
    rate: row.rate,
    currency: row.currency,
    is_fixed: row.isFixed,
    price_guidance: row.priceGuidance ?? undefined,
    parameters: row.parameters ?? undefined,
    min_spend_per_package: row.minSpendPerPackage ?? undefined,
  };
}

/**
 * Convert a product DB row and its pricing options to an AdCP Product object.
 */
export function convertProductRowToAdcp(
  row: ProductRow,
  pricingOpts: PricingOptionRow[]
): AdcpProduct {
  const pricingOptions = pricingOpts.map(mapPricingOption);

  return {
    product_id: row.productId,
    name: row.name,
    description: row.description ?? "",
    format_ids: Array.isArray(row.formatIds)
      ? (row.formatIds as FormatId[])
      : [],
    targeting_template: row.targetingTemplate,
    delivery_type: row.deliveryType as DeliveryType,
    measurement: row.measurement ?? undefined,
    is_custom: row.isCustom ?? false,
    implementation_config: row.implementationConfig ?? undefined,
    property_tags: row.propertyTags ?? undefined,
    pricing_options: pricingOptions,
  };
}

/**
 * Add backward-compatible `pricing` field derived from the first entry in
 * `pricing_options`. Used for v1 API consumers that expect a single pricing object.
 */
export function addV2Compat(product: AdcpProduct): AdcpProduct {
  if (product.pricing_options.length > 0) {
    product.pricing = product.pricing_options[0];
  }
  return product;
}

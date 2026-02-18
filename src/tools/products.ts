/**
 * get_products: product discovery by brief or ids.
 * Shared implementation for MCP and A2A.
 */

import { getDb } from "../db/client.js";
import { listProductsByTenant, listPricingOptionsByTenant } from "../db/repositories/product.js";
import { getAdapter } from "../core/adapterRegistry.js";
import { toPrincipal } from "../core/adapterRegistry.js";
import type { ToolContext } from "../core/auth/types.js";
import type { GetProductsResponse, Product } from "../types/adcp.js";
import type { GetProductsRequest } from "./types.js";

function rowToProduct(row: {
  productId: string;
  name: string;
  description: string | null;
  formatIds: unknown;
  targetingTemplate: unknown;
  deliveryType: string;
  implementationConfig: unknown;
  propertyTags: unknown;
}): Product {
  return {
    product_id: row.productId,
    name: row.name,
    description: row.description ?? "",
    format_ids: Array.isArray(row.formatIds) ? (row.formatIds as Product["format_ids"]) : [],
    delivery_type: row.deliveryType as Product["delivery_type"],
    implementation_config: row.implementationConfig,
    property_tags: row.propertyTags,
  } as Product;
}

export async function runGetProducts(
  ctx: ToolContext,
  req: GetProductsRequest
): Promise<GetProductsResponse> {
  const db = getDb();
  const productRows = await listProductsByTenant(db, ctx.tenantId);
  const pricingRows = await listPricingOptionsByTenant(db, ctx.tenantId);
  const pricingByProduct = new Map<string, typeof pricingRows>();
  for (const p of pricingRows) {
    const key = `${p.tenantId}:${p.productId}`;
    if (!pricingByProduct.has(key)) pricingByProduct.set(key, []);
    pricingByProduct.get(key)!.push(p);
  }

  let products = productRows.map((row) => {
    const p = rowToProduct(row);
    const opts = pricingByProduct.get(`${row.tenantId}:${row.productId}`) ?? [];
    p.pricing_options = opts.map((o) => ({
      pricing_model: o.pricingModel,
      rate: o.rate,
      currency: o.currency,
    }));
    return p;
  });

  if (req.product_ids?.length) {
    const idSet = new Set(req.product_ids);
    products = products.filter((p) => idSet.has(p.product_id));
  }

  if (req.brief && typeof req.brief === "string" && req.brief.trim()) {
    const brief = (req.brief as string).toLowerCase();
    products = products.filter(
      (p) =>
        p.name.toLowerCase().includes(brief) ||
        (p.description && String(p.description).toLowerCase().includes(brief))
    );
  }

  const principal = ctx.principal ? toPrincipal(ctx.principal) : { principal_id: ctx.principalId ?? "", name: "anonymous", platform_mappings: {} };
  const adapter = await getAdapter(ctx.tenantId, principal, true);
  const supported = adapter.get_supported_pricing_models();
  for (const p of products) {
    const opts = (p.pricing_options as { pricing_model?: string }[]) ?? [];
    for (const o of opts) {
      if (o.pricing_model && !supported.has(o.pricing_model.toLowerCase())) {
        o.pricing_model = "cpm";
      }
    }
  }

  return { products };
}

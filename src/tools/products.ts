/**
 * get_products: thin tool facade delegating to ProductService.
 */

import type { ToolContext } from "../core/auth/types.js";
import type { GetProductsResponse } from "../types/adcp.js";
import * as ProductService from "../services/ProductService.js";
import type { GetProductsRequest } from "./types.js";

export async function runGetProducts(
  ctx: ToolContext,
  req: GetProductsRequest
): Promise<GetProductsResponse> {
  return ProductService.getProducts(ctx, {
    brief: req.brief,
    product_ids: req.product_ids,
  });
}

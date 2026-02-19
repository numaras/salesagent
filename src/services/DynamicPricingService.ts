import { getDb } from "../db/client.js";
import { listPricingOptionsByProduct } from "../db/repositories/product.js";

export interface DynamicPriceParams {
  impressions: number;
  days: number;
}

export interface DynamicPriceResult {
  cpm: number;
  discount_pct: number;
}

export async function calculateDynamicPrice(
  tenantId: string,
  productId: string,
  params: DynamicPriceParams
): Promise<DynamicPriceResult> {
  const db = getDb();
  const pricingOptions = await listPricingOptionsByProduct(db, tenantId, productId);

  const cpmOption = pricingOptions.find((o) => o.pricingModel === "cpm");
  const baseCpm = cpmOption?.rate ? parseFloat(cpmOption.rate) : 10.0;

  let discountPct = 0;
  if (params.impressions > 5_000_000) {
    discountPct = 20;
  } else if (params.impressions > 1_000_000) {
    discountPct = 10;
  }

  const cpm = Math.round(baseCpm * (1 - discountPct / 100) * 100) / 100;

  return { cpm, discount_pct: discountPct };
}

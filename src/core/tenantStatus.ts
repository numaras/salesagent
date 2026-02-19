/**
 * Tenant ad server configuration status checking.
 * Reports whether a tenant has all required configuration to operate.
 */

import { eq } from "drizzle-orm";
import { getDb } from "../db/client.js";
import {
  adapterConfig,
  products,
  principals,
  currencyLimits,
} from "../db/schema.js";

export interface TenantStatusResult {
  configured: boolean;
  missing: string[];
}

/**
 * Check whether a tenant has all required configuration:
 *   - adapter_config row
 *   - at least 1 product
 *   - at least 1 principal
 *   - at least 1 currency_limit
 *
 * Returns a status object indicating what (if anything) is missing.
 */
export async function getTenantStatus(
  tenantId: string
): Promise<TenantStatusResult> {
  const db = getDb();
  const missing: string[] = [];

  const [adapterRows, productRows, principalRows, currencyRows] =
    await Promise.all([
      db
        .select({ tenantId: adapterConfig.tenantId })
        .from(adapterConfig)
        .where(eq(adapterConfig.tenantId, tenantId))
        .limit(1),
      db
        .select({ productId: products.productId })
        .from(products)
        .where(eq(products.tenantId, tenantId))
        .limit(1),
      db
        .select({ principalId: principals.principalId })
        .from(principals)
        .where(eq(principals.tenantId, tenantId))
        .limit(1),
      db
        .select({ currencyCode: currencyLimits.currencyCode })
        .from(currencyLimits)
        .where(eq(currencyLimits.tenantId, tenantId))
        .limit(1),
    ]);

  if (adapterRows.length === 0) missing.push("adapter_config");
  if (productRows.length === 0) missing.push("products");
  if (principalRows.length === 0) missing.push("principals");
  if (currencyRows.length === 0) missing.push("currency_limits");

  return {
    configured: missing.length === 0,
    missing,
  };
}

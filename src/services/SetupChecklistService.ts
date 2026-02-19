/**
 * Tenant setup progress: checks which onboarding steps are complete.
 */

import { eq } from "drizzle-orm";
import { getDb } from "../db/client.js";
import { getAdapterConfigByTenant } from "../db/repositories/adapter-config.js";
import { listProductsByTenant } from "../db/repositories/product.js";
import { NotFoundError } from "../core/errors.js";
import { getTenantById } from "../db/repositories/tenant.js";
import { principals, currencyLimits } from "../db/schema.js";

export interface ChecklistItem {
  key: string;
  label: string;
  completed: boolean;
}

export interface ChecklistResult {
  items: ChecklistItem[];
}

export async function getChecklist(tenantId: string): Promise<ChecklistResult> {
  const db = getDb();

  const tenant = await getTenantById(db, tenantId);
  if (!tenant) throw new NotFoundError("Tenant", tenantId);

  const [adapterCfg, productRows, principalRows, currencyRows] =
    await Promise.all([
      getAdapterConfigByTenant(db, tenantId),
      listProductsByTenant(db, tenantId),
      db
        .select()
        .from(principals)
        .where(eq(principals.tenantId, tenantId))
        .limit(1),
      db
        .select()
        .from(currencyLimits)
        .where(eq(currencyLimits.tenantId, tenantId))
        .limit(1),
    ]);

  return {
    items: [
      {
        key: "has_adapter_config",
        label: "Ad server adapter configured",
        completed: adapterCfg != null,
      },
      {
        key: "has_products",
        label: "At least one product created",
        completed: productRows.length > 0,
      },
      {
        key: "has_principals",
        label: "At least one advertiser (principal) created",
        completed: principalRows.length > 0,
      },
      {
        key: "has_currency_limits",
        label: "Currency limits configured",
        completed: currencyRows.length > 0,
      },
    ],
  };
}

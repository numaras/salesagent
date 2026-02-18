import { and, eq } from "drizzle-orm";
import type { DrizzleDb } from "../client.js";
import { pricingOptions, products } from "../schema.js";

export type ProductRow = typeof products.$inferSelect;
export type PricingOptionRow = typeof pricingOptions.$inferSelect;

export async function listProductsByTenant(
  db: DrizzleDb,
  tenantId: string
): Promise<ProductRow[]> {
  return db.select().from(products).where(eq(products.tenantId, tenantId));
}

export async function getProductById(
  db: DrizzleDb,
  tenantId: string,
  productId: string
): Promise<ProductRow | undefined> {
  const rows = await db
    .select()
    .from(products)
    .where(and(eq(products.tenantId, tenantId), eq(products.productId, productId)))
    .limit(1);
  return rows[0];
}

export async function listPricingOptionsByProduct(
  db: DrizzleDb,
  tenantId: string,
  productId: string
): Promise<PricingOptionRow[]> {
  return db
    .select()
    .from(pricingOptions)
    .where(
      and(eq(pricingOptions.tenantId, tenantId), eq(pricingOptions.productId, productId))
    );
}

export async function listPricingOptionsByTenant(
  db: DrizzleDb,
  tenantId: string
): Promise<PricingOptionRow[]> {
  return db.select().from(pricingOptions).where(eq(pricingOptions.tenantId, tenantId));
}

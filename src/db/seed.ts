/**
 * Database seed script.
 * Creates a default tenant with mock adapter, a test principal,
 * sample products with pricing, and a USD currency limit.
 *
 * Idempotent: uses ON CONFLICT DO NOTHING so safe to re-run.
 * Usage: npx tsx src/db/seed.ts  (or via npm run db:seed)
 */

import { withTransaction } from "./client.js";
import {
  tenants,
  adapterConfig,
  principals,
  products,
  pricingOptions,
  currencyLimits,
} from "./schema.js";

async function seed(): Promise<void> {
  await withTransaction(async (tx) => {
    await tx
      .insert(tenants)
      .values({
        tenantId: "default",
        name: "Default Publisher",
        subdomain: "default",
        adServer: "mock",
        isActive: true,
      })
      .onConflictDoNothing({ target: tenants.tenantId });

    await tx
      .insert(adapterConfig)
      .values({
        tenantId: "default",
        adapterType: "mock",
        mockDryRun: false,
      })
      .onConflictDoNothing({ target: adapterConfig.tenantId });

    await tx
      .insert(principals)
      .values({
        tenantId: "default",
        principalId: "test_buyer",
        name: "Test Buyer",
        accessToken: "test-token",
        platformMappings: {},
      })
      .onConflictDoNothing();

    await tx
      .insert(products)
      .values({
        tenantId: "default",
        productId: "display_banner",
        name: "Display Banner",
        description: "Standard IAB display banner across all inventory.",
        formatIds: [
          { agent_url: "https://example.com", id: "300x250" },
          { agent_url: "https://example.com", id: "728x90" },
        ],
        targetingTemplate: { geo: ["US"] },
        deliveryType: "non_guaranteed",
        isCustom: false,
        propertyTags: ["all_inventory"],
      })
      .onConflictDoNothing();

    await tx
      .insert(products)
      .values({
        tenantId: "default",
        productId: "video_preroll",
        name: "Video Pre-roll",
        description: "15-30 second pre-roll video across premium video inventory.",
        formatIds: [
          { agent_url: "https://example.com", id: "video_preroll_15s" },
          { agent_url: "https://example.com", id: "video_preroll_30s" },
        ],
        targetingTemplate: { geo: ["US"], content: ["video"] },
        deliveryType: "guaranteed",
        isCustom: false,
        propertyTags: ["all_inventory"],
      })
      .onConflictDoNothing();

    await tx
      .insert(pricingOptions)
      .values([
        {
          tenantId: "default",
          productId: "display_banner",
          pricingModel: "cpm",
          rate: "5.00",
          currency: "USD",
          isFixed: false,
        },
        {
          tenantId: "default",
          productId: "display_banner",
          pricingModel: "cpc",
          rate: "1.50",
          currency: "USD",
          isFixed: false,
        },
        {
          tenantId: "default",
          productId: "video_preroll",
          pricingModel: "cpm",
          rate: "25.00",
          currency: "USD",
          isFixed: true,
        },
      ])
      .onConflictDoNothing();

    await tx
      .insert(currencyLimits)
      .values({
        tenantId: "default",
        currencyCode: "USD",
        minPackageBudget: "100.00",
        maxDailyPackageSpend: "10000.00",
      })
      .onConflictDoNothing();
  });

  console.log("Seed complete: default tenant, principal, products, and currency limit created.");
}

seed()
  .then(() => {
    process.exit(0);
  })
  .catch((err: unknown) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });

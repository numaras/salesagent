/**
 * GAM integration test – skipped unless GAM_INTEGRATION=1 and GAM_NETWORK_CODE (and credentials) are set.
 * Run with: GAM_INTEGRATION=1 GAM_NETWORK_CODE=12345678 GAM_OAUTH_CLIENT_ID=... GAM_OAUTH_CLIENT_SECRET=... npm test -- tests/ts/adapters/gam/gamIntegration.test.ts
 * Or use a service account: GAM_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}' (and omit OAuth env vars).
 */

import { describe, expect, it } from "vitest";
import type { Principal } from "../../../../src/types/adcp.js";
import { createGamClient, GoogleAdManager } from "../../../../src/adapters/gam/index.js";

const runIntegration = Boolean(
  process.env.GAM_INTEGRATION === "1" && process.env.GAM_NETWORK_CODE
);

describe.skipIf(!runIntegration)("GAM integration", () => {
  it("createGamClient getOrderService does not throw when credentials are valid", async () => {
    const networkCode = process.env.GAM_NETWORK_CODE!;
    const refreshToken = process.env.GAM_REFRESH_TOKEN;
    const serviceAccountJson = process.env.GAM_SERVICE_ACCOUNT_JSON;
    if (!refreshToken && !serviceAccountJson) {
      console.warn("Set GAM_REFRESH_TOKEN or GAM_SERVICE_ACCOUNT_JSON to run this test");
      return;
    }
    const client = createGamClient({
      networkCode,
      advertiserId: process.env.GAM_ADVERTISER_ID ?? null,
      traffickerId: process.env.GAM_TRAFFICKER_ID ?? null,
      refreshToken: refreshToken ?? undefined,
      serviceAccountJson: serviceAccountJson ?? undefined,
      dryRun: true,
    });
    const orderService = await client.getOrderService();
    expect(orderService).toBeDefined();
    expect(typeof orderService.createOrders).toBe("function");
  });

  it("GoogleAdManager create_media_buy dry_run returns success", async () => {
    const networkCode = process.env.GAM_NETWORK_CODE!;
    const principal: Principal = {
      principal_id: "int_test",
      name: "Integration Test",
      platform_mappings: {
        google_ad_manager: {
          advertiser_id: process.env.GAM_ADVERTISER_ID ?? "0",
        },
      },
    };
    const adapter = new GoogleAdManager(
      {
        networkCode,
        advertiserId: process.env.GAM_ADVERTISER_ID ?? null,
        traffickerId: process.env.GAM_TRAFFICKER_ID ?? null,
        dryRun: true,
      },
      principal
    );
    const res = await adapter.create_media_buy(
      { product_ids: ["p1"] },
      [
        {
          package_id: "pkg1",
          name: "Test",
          delivery_type: "guaranteed",
          cpm: 10,
          impressions: 1000,
          format_ids: [{ agent_url: "https://example.org", id: "1x1" }],
        },
      ],
      new Date(),
      new Date(Date.now() + 86400 * 7 * 1000)
    );
    expect(res.status).toBe("success");
  });
});

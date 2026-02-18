import { describe, expect, it } from "vitest";
import type { LineItemService, OrderService } from "@guardian/google-admanager-api";
import type { CreateMediaBuyRequest, MediaPackage, Principal } from "../../../../src/types/adcp.js";
import type { GamClientWrapper } from "../../../../src/adapters/gam/client.js";
import { GoogleAdManager } from "../../../../src/adapters/gam/GoogleAdManager.js";

function makeMockClient(orderId: number = 12345): GamClientWrapper {
  return {
    async getOrderService(): Promise<OrderService> {
      return {
        createOrders: async () => [{ id: orderId }],
        performOrderAction: async () => ({ numChanges: 1 }),
      } as unknown as OrderService;
    },
    async getLineItemService(): Promise<LineItemService> {
      return {
        createLineItems: async () => [{ id: 1 }],
      } as unknown as LineItemService;
    },
  };
}

function samplePackages(): MediaPackage[] {
  return [
    {
      package_id: "pkg_1",
      name: "Guaranteed Banner",
      delivery_type: "guaranteed",
      cpm: 15,
      impressions: 100_000,
      format_ids: [{ agent_url: "https://example.org", id: "300x250" }],
    },
  ];
}

describe("GoogleAdManager", () => {
  const principal: Principal = {
    principal_id: "test_principal",
    name: "Test",
    platform_mappings: { google_ad_manager: { advertiser_id: "100" } },
  };

  const baseConfig = {
    networkCode: "12345678",
    advertiserId: "100",
    traffickerId: "200",
    dryRun: false,
  };

  it("get_supported_pricing_models returns cpm, vcpm, cpc, flat_rate", () => {
    const adapter = new GoogleAdManager(
      { ...baseConfig, advertiserId: null, traffickerId: null },
      principal
    );
    const set = adapter.get_supported_pricing_models();
    expect(set.has("cpm")).toBe(true);
    expect(set.has("vcpm")).toBe(true);
    expect(set.has("cpc")).toBe(true);
    expect(set.has("flat_rate")).toBe(true);
    expect(set.size).toBe(4);
  });

  it("get_targeting_capabilities returns GAM capabilities", () => {
    const adapter = new GoogleAdManager(
      { ...baseConfig, advertiserId: null, traffickerId: null },
      principal
    );
    const caps = adapter.get_targeting_capabilities();
    expect(caps.geo_countries).toBe(true);
    expect(caps.us_zip).toBe(true);
  });

  it("create_media_buy dry_run returns success with fake media_buy_id", async () => {
    const adapter = new GoogleAdManager(
      { ...baseConfig, dryRun: true },
      principal
    );
    const request: CreateMediaBuyRequest = { product_ids: ["p1"] };
    const start = new Date();
    const end = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const res = await adapter.create_media_buy(request, samplePackages(), start, end);
    expect(res.status).toBe("success");
    if (res.status === "success") {
      expect(res.media_buy_id).toMatch(/^gam_dry_/);
    }
  });

  it("create_media_buy without client returns error", async () => {
    const adapter = new GoogleAdManager(baseConfig, principal, null);
    const request: CreateMediaBuyRequest = { product_ids: ["p1"] };
    const start = new Date();
    const end = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const res = await adapter.create_media_buy(request, samplePackages(), start, end);
    expect(res.status).toBe("error");
    if (res.status === "error") {
      expect(res.error).toContain("client");
    }
  });

  it("create_media_buy with mock client returns success and order id", async () => {
    const mockClient = makeMockClient(99999);
    const adapter = new GoogleAdManager(baseConfig, principal, mockClient);
    const request: CreateMediaBuyRequest & { buyer_ref?: string } = {
      product_ids: ["p1"],
      buyer_ref: "ref_abc",
    };
    const start = new Date();
    const end = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const res = await adapter.create_media_buy(request, samplePackages(), start, end);
    expect(res.status).toBe("success");
    if (res.status === "success") {
      expect(res.media_buy_id).toBe("99999");
      expect(res.buyer_ref).toBe("ref_abc");
    }
  });

  it("create_media_buy with no packages returns error", async () => {
    const adapter = new GoogleAdManager(baseConfig, principal, makeMockClient());
    const request: CreateMediaBuyRequest = { product_ids: ["p1"] };
    const start = new Date();
    const end = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const res = await adapter.create_media_buy(request, [], start, end);
    expect(res.status).toBe("error");
    if (res.status === "error") {
      expect(res.error).toContain("package");
    }
  });

  it("constructor throws when networkCode missing", () => {
    expect(
      () =>
        new GoogleAdManager(
          { networkCode: "", advertiserId: null, traffickerId: null },
          principal
        )
    ).toThrow("networkCode");
  });

  it("constructor throws when advertiser_id non-numeric", () => {
    expect(
      () =>
        new GoogleAdManager(
          { ...baseConfig, advertiserId: "not-a-number" },
          principal
        )
    ).toThrow("advertiser_id");
  });
});

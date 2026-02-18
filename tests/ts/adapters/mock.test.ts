import { describe, expect, it } from "vitest";
import type { CreateMediaBuyRequest, MediaPackage, Principal } from "../../../src/types/adcp.js";
import {
  DEFAULT_CHANNELS,
  getMockAdapterPrincipalId,
  MockAdServer,
  MOCK_CAPABILITIES,
} from "../../../src/adapters/mock/index.js";

const DEFAULT_AGENT_URL = "https://creative.adcontextprotocol.org";

function makeFormatId(id: string) {
  return { agent_url: DEFAULT_AGENT_URL, id };
}

function samplePackages(): MediaPackage[] {
  return [
    {
      package_id: "pkg_1",
      name: "Guaranteed Banner",
      delivery_type: "guaranteed",
      cpm: 15,
      impressions: 333333,
      budget: 5000,
      format_ids: [makeFormatId("display_300x250"), makeFormatId("display_728x90")],
    },
  ];
}

describe("MockAdServer", () => {
  it("create_media_buy returns success with media_buy_id and buyer_ref", () => {
    const principal: Principal = {
      principal_id: "test_principal",
      name: "Test Principal",
      platform_mappings: { mock: { advertiser_id: "test_advertiser" } },
    };
    const adapter = new MockAdServer({}, principal);
    const startTime = new Date();
    const endTime = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const request: CreateMediaBuyRequest & { po_number?: string; buyer_ref?: string } = {
      product_ids: ["prod_1"],
      buyer_ref: "ref_12345",
      po_number: "PO-12345",
    };
    const packages = samplePackages();

    const response = adapter.create_media_buy(request, packages, startTime, endTime);

    expect(response.status).toBe("success");
    if (response.status === "success") {
      expect(response.media_buy_id).toBe("buy_PO-12345");
      expect(response.buyer_ref).toBe("ref_12345");
    }
  });

  it("create_media_buy stores internal state when not dry_run", () => {
    const principal: Principal = {
      principal_id: "test_principal",
      name: "Test Principal",
      platform_mappings: {},
    };
    const adapter = new MockAdServer({}, principal, false);
    const startTime = new Date();
    const endTime = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const request: CreateMediaBuyRequest & { po_number?: string } = {
      product_ids: ["prod_1"],
      po_number: "PO-12345",
    };
    const packages = samplePackages();

    adapter.create_media_buy(request, packages, startTime, endTime);

    const internal = adapter._mediaBuys.get("buy_PO-12345");
    expect(internal).toBeDefined();
    expect((internal as Record<string, unknown>).total_budget).toBe(5000);
    const pkgList = (internal as Record<string, unknown>).packages as Record<string, unknown>[];
    expect(pkgList).toHaveLength(1);
    expect(pkgList[0].package_id).toBe("pkg_1");
  });

  it("create_media_buy without po_number generates unique media_buy_id", () => {
    const principal: Principal = {
      principal_id: "p",
      name: "P",
      platform_mappings: {},
    };
    const adapter = new MockAdServer({}, principal);
    const request: CreateMediaBuyRequest = { product_ids: ["prod_1"] };
    const packages = samplePackages();
    const startTime = new Date();
    const endTime = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const response = adapter.create_media_buy(request, packages, startTime, endTime);

    expect(response.status).toBe("success");
    if (response.status === "success") {
      expect(response.media_buy_id).toMatch(/^buy_[a-f0-9-]+$/);
    }
  });

  it("get_supported_pricing_models returns all mock models", () => {
    const principal: Principal = {
      principal_id: "p",
      name: "P",
      platform_mappings: {},
    };
    const adapter = new MockAdServer({}, principal);
    const models = adapter.get_supported_pricing_models();
    expect(models.has("cpm")).toBe(true);
    expect(models.has("flat_rate")).toBe(true);
    expect(models.size).toBeGreaterThanOrEqual(7);
  });

  it("get_targeting_capabilities returns full targeting", () => {
    const principal: Principal = {
      principal_id: "p",
      name: "P",
      platform_mappings: {},
    };
    const adapter = new MockAdServer({}, principal);
    const caps = adapter.get_targeting_capabilities();
    expect(caps.geo_countries).toBe(true);
    expect(caps.us_zip).toBe(true);
  });

  it("dry_run create_media_buy does not store state", () => {
    const principal: Principal = {
      principal_id: "p",
      name: "P",
      platform_mappings: {},
    };
    const adapter = new MockAdServer({ dry_run: true }, principal, true);
    const request: CreateMediaBuyRequest & { po_number?: string } = {
      product_ids: ["prod_1"],
      po_number: "PO-dry",
    };
    adapter.create_media_buy(request, samplePackages(), new Date(), new Date());
    expect(adapter._mediaBuys.has("buy_PO-dry")).toBe(false);
  });
});

describe("MockAdServer constants", () => {
  it("DEFAULT_CHANNELS includes display and olv", () => {
    expect(DEFAULT_CHANNELS).toContain("display");
    expect(DEFAULT_CHANNELS).toContain("olv");
  });

  it("MOCK_CAPABILITIES has supported_pricing_models", () => {
    expect(MOCK_CAPABILITIES.supported_pricing_models).toContain("cpm");
    expect(MOCK_CAPABILITIES.supported_pricing_models).toContain("flat_rate");
  });
});

describe("getMockAdapterPrincipalId", () => {
  it("returns advertiser_id from platform_mappings.mock", () => {
    const principal: Principal = {
      principal_id: "p",
      name: "P",
      platform_mappings: { mock: { advertiser_id: "adv_123" } },
    };
    expect(getMockAdapterPrincipalId(principal)).toBe("adv_123");
  });

  it("returns undefined when mock mapping missing", () => {
    const principal: Principal = {
      principal_id: "p",
      name: "P",
      platform_mappings: {},
    };
    expect(getMockAdapterPrincipalId(principal)).toBeUndefined();
  });
});

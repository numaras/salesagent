/**
 * Tests for AdCP TypeScript types (mirroring Python schema contract).
 */
import { describe, it, expect } from "vitest";
import {
  type Principal,
  type FormatId,
  type Budget,
  type Product,
  type MediaPackage,
  type CreateMediaBuyRequest,
  type CreateMediaBuyResponse,
  type CreateMediaBuySuccessResponse,
  type CreateMediaBuyErrorResponse,
  isCreateMediaBuySuccess,
  isCreateMediaBuyError,
} from "../../../src/types/adcp.js";

describe("FormatId", () => {
  it("allows minimal agent_url and id", () => {
    const fmt: FormatId = { agent_url: "https://creative.example.com", id: "display_300x250" };
    expect(fmt.agent_url).toBe("https://creative.example.com");
    expect(fmt.id).toBe("display_300x250");
  });

  it("allows optional width, height, duration_ms", () => {
    const fmt: FormatId = {
      agent_url: "https://creative.example.com",
      id: "video_15s",
      width: 1920,
      height: 1080,
      duration_ms: 15000,
    };
    expect(fmt.duration_ms).toBe(15000);
  });
});

describe("Principal", () => {
  it("has required principal_id, name, platform_mappings", () => {
    const p: Principal = {
      principal_id: "prin_1",
      name: "Acme",
      platform_mappings: { google_ad_manager: { advertiser_id: "123" } },
    };
    expect(p.principal_id).toBe("prin_1");
    expect(p.platform_mappings).toEqual({ google_ad_manager: { advertiser_id: "123" } });
  });
});

describe("Budget", () => {
  it("has required total and currency", () => {
    const b: Budget = { total: 5000, currency: "USD" };
    expect(b.total).toBe(5000);
    expect(b.currency).toBe("USD");
  });

  it("allows optional daily_cap and pacing", () => {
    const b: Budget = {
      total: 10000,
      currency: "EUR",
      daily_cap: 500,
      pacing: "even",
    };
    expect(b.pacing).toBe("even");
  });
});

describe("Product", () => {
  it("has required product_id, name, description, format_ids, delivery_type", () => {
    const prod: Product = {
      product_id: "prod_1",
      name: "Display",
      description: "Display product",
      format_ids: [{ agent_url: "https://creative.example.com", id: "300x250" }],
      delivery_type: "non_guaranteed",
    };
    expect(prod.product_id).toBe("prod_1");
    expect(prod.delivery_type).toBe("non_guaranteed");
  });
});

describe("MediaPackage", () => {
  it("has required package fields and format_ids", () => {
    const pkg: MediaPackage = {
      package_id: "pkg_1",
      name: "Package A",
      delivery_type: "guaranteed",
      cpm: 2.5,
      impressions: 100000,
      format_ids: [{ agent_url: "https://creative.example.com", id: "300x250" }],
    };
    expect(pkg.cpm).toBe(2.5);
    expect(pkg.impressions).toBe(100000);
  });

  it("allows optional buyer_ref, product_id, budget, creative_ids", () => {
    const pkg: MediaPackage = {
      package_id: "pkg_2",
      name: "Package B",
      delivery_type: "non_guaranteed",
      cpm: 1,
      impressions: 50000,
      format_ids: [],
      buyer_ref: "ref1",
      product_id: "prod_1",
      budget: 5000,
      creative_ids: ["cr_1"],
    };
    expect(pkg.creative_ids).toEqual(["cr_1"]);
  });
});

describe("CreateMediaBuyRequest", () => {
  it("has product_ids and allows optional budget, packages, context", () => {
    const req: CreateMediaBuyRequest = {
      product_ids: ["prod_1"],
      budget: { total: 5000, currency: "USD" },
    };
    expect(req.product_ids).toEqual(["prod_1"]);
    expect((req.budget as Budget).currency).toBe("USD");
  });
});

describe("CreateMediaBuyResponse type guards", () => {
  it("isCreateMediaBuySuccess identifies success response", () => {
    const success: CreateMediaBuySuccessResponse = {
      status: "success",
      media_buy_id: "mb_123",
    };
    expect(isCreateMediaBuySuccess(success)).toBe(true);
    expect(isCreateMediaBuyError(success)).toBe(false);
  });

  it("isCreateMediaBuyError identifies error response", () => {
    const error: CreateMediaBuyErrorResponse = {
      status: "error",
      error: "Validation failed",
      detail: "Invalid product_id",
    };
    expect(isCreateMediaBuyError(error)).toBe(true);
    expect(isCreateMediaBuySuccess(error)).toBe(false);
  });

  it("narrows union type for success", () => {
    const res: CreateMediaBuyResponse = { status: "success", media_buy_id: "mb_1" };
    if (isCreateMediaBuySuccess(res)) {
      expect(res.media_buy_id).toBe("mb_1");
    }
  });

  it("narrows union type for error", () => {
    const res: CreateMediaBuyResponse = { status: "error", error: "Failed" };
    if (isCreateMediaBuyError(res)) {
      expect(res.error).toBe("Failed");
    }
  });
});

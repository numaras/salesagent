import { beforeEach, describe, expect, it, vi } from "vitest";
import { isPublicApiPath } from "../../../src/admin/api.js";
import type { ToolContext } from "../../../src/core/auth/types.js";
import type { CreateMediaBuyRequest, MediaPackage } from "../../../src/types/adcp.js";

type SelectRow = Record<string, unknown>;

const adapterMock = {
  create_media_buy: vi.fn(() => ({ status: "success", media_buy_id: "mb_1", buyer_ref: "buyer_1" })),
  update_media_buy: vi.fn(() => ({ status: "success" })),
  update_media_buy_performance_index: vi.fn(() => true),
};

const dbState = {
  selectQueue: [] as SelectRow[][],
};

function makeDb() {
  return {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => dbState.selectQueue.shift() ?? [],
        }),
      }),
    }),
  };
}

vi.mock("../../../src/core/adapterRegistry.js", () => ({
  ensurePrincipal: vi.fn(() => ({ name: "Test Principal" })),
  getAdapter: vi.fn(async () => adapterMock),
}));

vi.mock("../../../src/db/client.js", () => ({
  getDb: vi.fn(() => makeDb()),
  withTransaction: vi.fn(async (cb: (tx: unknown) => Promise<void>) => cb({})),
}));

vi.mock("../../../src/db/repositories/media-buy.js", () => ({
  getMediaBuyById: vi.fn(),
  insertMediaBuy: vi.fn(async () => ({})),
  insertMediaPackages: vi.fn(async () => []),
  listPackagesByMediaBuy: vi.fn(),
}));

vi.mock("../../../src/db/repositories/product.js", () => ({
  listPricingOptionsByProduct: vi.fn(),
}));

import { createMediaBuy, updateMediaBuy } from "../../../src/services/MediaBuyService.js";
import { getMediaBuyById, listPackagesByMediaBuy } from "../../../src/db/repositories/media-buy.js";
import { listPricingOptionsByProduct } from "../../../src/db/repositories/product.js";

describe("Security regression: control-plane setup protection", () => {
  it("keeps onboarding setup private", () => {
    expect(isPublicApiPath("/onboarding/status")).toBe(true);
    expect(isPublicApiPath("/onboarding/setup")).toBe(false);
  });
});

describe("Security regression: SSRF", () => {
  it("blocks DNS-resolved private IP targets", async () => {
    vi.resetModules();
    vi.doMock("node:dns/promises", () => ({
      default: {
        lookup: vi.fn(async () => [{ address: "10.1.2.3", family: 4 }]),
      },
    }));
    const { isUrlSafeWithDns } = await import("../../../src/core/security/ssrf.js");
    await expect(isUrlSafeWithDns("https://safe.example.com/webhook")).resolves.toBe(false);
    vi.doUnmock("node:dns/promises");
  });
});

describe("Security regression: financial and workflow guardrails", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbState.selectQueue = [];
  });

  const ctx: ToolContext = { tenantId: "tenant_1", principalId: "principal_1", principal: null };
  const start = new Date("2026-01-01T00:00:00.000Z");
  const end = new Date("2026-01-31T00:00:00.000Z");

  function baseRequest(pkg: MediaPackage): CreateMediaBuyRequest {
    return {
      product_ids: ["prod_1"],
      budget: { total: pkg.budget ?? 0, currency: "USD" },
      packages: [pkg],
    };
  }

  it("rejects extreme package budgets above tenant spend limits", async () => {
    dbState.selectQueue = [[{ minPackageBudget: "100.00", maxDailyPackageSpend: "10000.00" }]];
    vi.mocked(listPricingOptionsByProduct).mockResolvedValueOnce([]);

    const request = baseRequest({
      package_id: "pkg_1",
      name: "Package",
      delivery_type: "guaranteed",
      cpm: 10,
      impressions: 100_000,
      budget: 50_000,
      format_ids: [{ agent_url: "https://creative.example.com", id: "display_300x250" }],
    });

    await expect(createMediaBuy(ctx, request, start, end)).rejects.toThrow(/exceeds max allowed/i);
  });

  it("rejects unsupported campaign currencies to prevent silent rewrites", async () => {
    dbState.selectQueue = [[]];
    vi.mocked(listPricingOptionsByProduct).mockResolvedValueOnce([]);

    const request: CreateMediaBuyRequest = {
      product_ids: ["prod_1"],
      budget: { total: 1_000, currency: "EUR" },
      packages: [
        {
          package_id: "pkg_1",
          name: "Package",
          delivery_type: "guaranteed",
          cpm: 10,
          impressions: 100_000,
          budget: 1_000,
          format_ids: [{ agent_url: "https://creative.example.com", id: "display_300x250" }],
        },
      ],
    };

    await expect(createMediaBuy(ctx, request, start, end)).rejects.toThrow(/unsupported currency/i);
  });

  it("rejects package budget updates below minimum spend policy", async () => {
    dbState.selectQueue = [[{ minPackageBudget: "100.00", maxDailyPackageSpend: "10000.00" }]];
    vi.mocked(getMediaBuyById).mockResolvedValueOnce({
      mediaBuyId: "mb_1",
      tenantId: "tenant_1",
      currency: "USD",
    } as never);
    vi.mocked(listPackagesByMediaBuy).mockResolvedValueOnce([
      { packageId: "pkg_1", packageConfig: { product_id: "prod_1" } } as never,
    ]);
    vi.mocked(listPricingOptionsByProduct).mockResolvedValueOnce([
      { currency: "USD", minSpendPerPackage: "250.00" } as never,
    ]);

    await expect(
      updateMediaBuy(ctx, "mb_1", "buyer_1", "update_budget", "pkg_1", 50)
    ).rejects.toThrow(/below minimum allowed/i);
  });

  it("blocks attaching pending-review creatives to packages", async () => {
    dbState.selectQueue = [
      [{ minPackageBudget: "100.00", maxDailyPackageSpend: "10000.00" }],
      [{ status: "pending_review" }],
    ];
    vi.mocked(listPricingOptionsByProduct).mockResolvedValueOnce([]);

    const request = baseRequest({
      package_id: "pkg_1",
      name: "Package",
      delivery_type: "guaranteed",
      cpm: 10,
      impressions: 100_000,
      budget: 1_000,
      creative_ids: ["cr_1"],
      format_ids: [{ agent_url: "https://creative.example.com", id: "display_300x250" }],
    });

    await expect(createMediaBuy(ctx, request, start, end)).rejects.toThrow(/not approved/i);
  });
});

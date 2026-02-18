import { describe, expect, it } from "vitest";
import {
  getCompatibleLineItemTypes,
  getDefaultPriority,
  getGamCostType,
  isCompatible,
  selectLineItemType,
} from "../../../../src/adapters/gam/pricingCompatibility.js";

describe("PricingCompatibility - matrix", () => {
  it("CPM compatible with all line item types", () => {
    const types = ["STANDARD", "SPONSORSHIP", "NETWORK", "PRICE_PRIORITY", "BULK", "HOUSE"] as const;
    for (const lineItemType of types) {
      expect(isCompatible(lineItemType, "cpm")).toBe(true);
    }
  });

  it("VCPM compatible with STANDARD only", () => {
    expect(isCompatible("STANDARD", "vcpm")).toBe(true);
    for (const lineItemType of ["SPONSORSHIP", "NETWORK", "PRICE_PRIORITY", "BULK", "HOUSE"] as const) {
      expect(isCompatible(lineItemType, "vcpm")).toBe(false);
    }
  });

  it("CPC compatible with STANDARD, SPONSORSHIP, NETWORK, PRICE_PRIORITY", () => {
    for (const lineItemType of ["STANDARD", "SPONSORSHIP", "NETWORK", "PRICE_PRIORITY"] as const) {
      expect(isCompatible(lineItemType, "cpc")).toBe(true);
    }
    for (const lineItemType of ["BULK", "HOUSE"] as const) {
      expect(isCompatible(lineItemType, "cpc")).toBe(false);
    }
  });

  it("flat_rate (CPD) compatible with SPONSORSHIP and NETWORK only", () => {
    for (const lineItemType of ["SPONSORSHIP", "NETWORK"] as const) {
      expect(isCompatible(lineItemType, "flat_rate")).toBe(true);
    }
    for (const lineItemType of ["STANDARD", "PRICE_PRIORITY", "BULK", "HOUSE"] as const) {
      expect(isCompatible(lineItemType, "flat_rate")).toBe(false);
    }
  });
});

describe("PricingCompatibility - selectLineItemType", () => {
  it("flat_rate selects SPONSORSHIP", () => {
    expect(selectLineItemType("flat_rate", false)).toBe("SPONSORSHIP");
  });

  it("vcpm selects STANDARD", () => {
    expect(selectLineItemType("vcpm", false)).toBe("STANDARD");
  });

  it("guaranteed CPM selects STANDARD", () => {
    expect(selectLineItemType("cpm", true)).toBe("STANDARD");
  });

  it("non-guaranteed CPM selects PRICE_PRIORITY", () => {
    expect(selectLineItemType("cpm", false)).toBe("PRICE_PRIORITY");
  });

  it("non-guaranteed CPC selects PRICE_PRIORITY", () => {
    expect(selectLineItemType("cpc", false)).toBe("PRICE_PRIORITY");
  });

  it("guaranteed CPC selects STANDARD", () => {
    expect(selectLineItemType("cpc", true)).toBe("STANDARD");
  });

  it("override compatible type accepted", () => {
    expect(selectLineItemType("cpc", false, "NETWORK")).toBe("NETWORK");
  });

  it("override incompatible type throws", () => {
    expect(() =>
      selectLineItemType("flat_rate", false, "STANDARD")
    ).toThrow(/not compatible with pricing model 'flat_rate'/);
  });

  it("override vcpm with incompatible throws", () => {
    expect(() =>
      selectLineItemType("vcpm", false, "SPONSORSHIP")
    ).toThrow(/not compatible with pricing model 'vcpm'/);
  });
});

describe("PricingCompatibility - getGamCostType", () => {
  it("supported models map correctly", () => {
    expect(getGamCostType("cpm")).toBe("CPM");
    expect(getGamCostType("vcpm")).toBe("VCPM");
    expect(getGamCostType("cpc")).toBe("CPC");
    expect(getGamCostType("flat_rate")).toBe("CPD");
  });

  it("unsupported models throw", () => {
    for (const unsupported of ["cpcv", "cpv", "cpp", "invalid"]) {
      expect(() => getGamCostType(unsupported as "cpm")).toThrow(/not supported by GAM adapter/);
    }
  });
});

describe("PricingCompatibility - getDefaultPriority", () => {
  it("priorities match GAM conventions", () => {
    expect(getDefaultPriority("SPONSORSHIP")).toBe(4);
    expect(getDefaultPriority("STANDARD")).toBe(8);
    expect(getDefaultPriority("PRICE_PRIORITY")).toBe(12);
    expect(getDefaultPriority("BULK")).toBe(12);
    expect(getDefaultPriority("NETWORK")).toBe(16);
    expect(getDefaultPriority("HOUSE")).toBe(16);
  });

  it("unknown type defaults to 8", () => {
    expect(getDefaultPriority("UNKNOWN_TYPE" as "STANDARD")).toBe(8);
  });
});

describe("PricingCompatibility - getCompatibleLineItemTypes", () => {
  it("CPM compatible with all types", () => {
    const c = getCompatibleLineItemTypes("cpm");
    expect(c).toEqual(new Set(["STANDARD", "SPONSORSHIP", "NETWORK", "PRICE_PRIORITY", "BULK", "HOUSE"]));
  });

  it("VCPM compatible with STANDARD only", () => {
    expect(getCompatibleLineItemTypes("vcpm")).toEqual(new Set(["STANDARD"]));
  });

  it("CPC compatible with 4 types", () => {
    expect(getCompatibleLineItemTypes("cpc")).toEqual(
      new Set(["STANDARD", "SPONSORSHIP", "NETWORK", "PRICE_PRIORITY"])
    );
  });

  it("flat_rate compatible with SPONSORSHIP and NETWORK", () => {
    expect(getCompatibleLineItemTypes("flat_rate")).toEqual(new Set(["SPONSORSHIP", "NETWORK"]));
  });

  it("unsupported model returns empty set", () => {
    expect(getCompatibleLineItemTypes("cpcv" as "cpm")).toEqual(new Set());
  });
});

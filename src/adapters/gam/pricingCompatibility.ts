/**
 * GAM Pricing Model and Line Item Type Compatibility
 * Port of python_src/src/adapters/gam/pricing_compatibility.py
 * AdCP pricing: cpm, vcpm, cpc, flat_rate. GAM cost types: CPM, VCPM, CPC, CPD (flat_rate → CPD).
 */

export type PricingModel = "cpm" | "vcpm" | "cpc" | "flat_rate";
export type GamCostType = "CPM" | "VCPM" | "CPC" | "CPD";
export type LineItemType =
  | "STANDARD"
  | "SPONSORSHIP"
  | "NETWORK"
  | "PRICE_PRIORITY"
  | "BULK"
  | "HOUSE";

const COMPATIBILITY_MATRIX: Record<LineItemType, Set<string>> = {
  STANDARD: new Set(["CPM", "CPC", "VCPM", "CPM_IN_TARGET"]),
  SPONSORSHIP: new Set(["CPM", "CPC", "CPD"]),
  NETWORK: new Set(["CPM", "CPC", "CPD"]),
  PRICE_PRIORITY: new Set(["CPM", "CPC"]),
  BULK: new Set(["CPM"]),
  HOUSE: new Set(["CPM"]),
};

const ADCP_TO_GAM_COST_TYPE: Record<PricingModel, GamCostType> = {
  cpm: "CPM",
  vcpm: "VCPM",
  cpc: "CPC",
  flat_rate: "CPD",
};

export function isCompatible(lineItemType: LineItemType, pricingModel: PricingModel): boolean {
  const gamCostType = ADCP_TO_GAM_COST_TYPE[pricingModel];
  if (!gamCostType) return false;
  return COMPATIBILITY_MATRIX[lineItemType]?.has(gamCostType) ?? false;
}

export function getCompatibleLineItemTypes(pricingModel: PricingModel): Set<string> {
  const gamCostType = ADCP_TO_GAM_COST_TYPE[pricingModel];
  if (!gamCostType) return new Set();
  const compatible = new Set<string>();
  for (const [lineItemType, costTypes] of Object.entries(COMPATIBILITY_MATRIX)) {
    if (costTypes.has(gamCostType)) compatible.add(lineItemType);
  }
  return compatible;
}

export function selectLineItemType(
  pricingModel: PricingModel,
  isGuaranteed: boolean = false,
  overrideType?: LineItemType | null
): LineItemType {
  if (overrideType) {
    if (!isCompatible(overrideType, pricingModel)) {
      const compatible = getCompatibleLineItemTypes(pricingModel);
      throw new Error(
        `Line item type '${overrideType}' is not compatible with pricing model '${pricingModel}'. ` +
          `GAM supports ${pricingModel.toUpperCase()} with: ${[...compatible].sort().join(", ")}`
      );
    }
    return overrideType;
  }

  if (pricingModel === "flat_rate") return "SPONSORSHIP";
  if (pricingModel === "vcpm") return "STANDARD";
  if (isGuaranteed) return "STANDARD";
  return "PRICE_PRIORITY";
}

export function getGamCostType(pricingModel: PricingModel): GamCostType {
  const costType = ADCP_TO_GAM_COST_TYPE[pricingModel];
  if (!costType) {
    throw new Error(`Pricing model '${pricingModel}' not supported by GAM adapter`);
  }
  return costType;
}

const DEFAULT_PRIORITIES: Partial<Record<LineItemType, number>> = {
  SPONSORSHIP: 4,
  STANDARD: 8,
  PRICE_PRIORITY: 12,
  BULK: 12,
  NETWORK: 16,
  HOUSE: 16,
};

export function getDefaultPriority(lineItemType: LineItemType): number {
  return DEFAULT_PRIORITIES[lineItemType] ?? 8;
}

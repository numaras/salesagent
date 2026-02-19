/**
 * GAM constants for order / line item / creative configuration.
 * Values mirror the @guardian/google-admanager-api enums for quick reference
 * when building requests outside of the SDK's enum imports.
 */

export const LINE_ITEM_TYPES = {
  STANDARD: "STANDARD",
  SPONSORSHIP: "SPONSORSHIP",
  NETWORK: "NETWORK",
  PRICE_PRIORITY: "PRICE_PRIORITY",
  BULK: "BULK",
  HOUSE: "HOUSE",
} as const;

export const COST_TYPES = {
  CPM: "CPM",
  CPC: "CPC",
  CPD: "CPD",
  VCPM: "VCPM",
} as const;

export const CREATIVE_ROTATION_TYPES = {
  EVEN: "EVEN",
  OPTIMIZED: "OPTIMIZED",
  MANUAL: "MANUAL",
  SEQUENTIAL: "SEQUENTIAL",
} as const;

export const DELIVERY_RATE_TYPES = {
  EVENLY: "EVENLY",
  FRONTLOADED: "FRONTLOADED",
  AS_FAST_AS_POSSIBLE: "AS_FAST_AS_POSSIBLE",
} as const;

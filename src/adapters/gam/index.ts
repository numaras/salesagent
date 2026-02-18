export { GoogleAdManager } from "./GoogleAdManager.js";
export { createGamClient, type GamClientWrapper } from "./client.js";
export { buildGamCredential } from "./auth.js";
export { createOrderWithLineItems } from "./orders.js";
export type { GamConfig } from "./types.js";
export { getGamAdapterPrincipalId } from "./types.js";
export {
  getGamCostType,
  getCompatibleLineItemTypes,
  getDefaultPriority,
  isCompatible,
  selectLineItemType,
} from "./pricingCompatibility.js";
export type { PricingModel, LineItemType, GamCostType } from "./pricingCompatibility.js";

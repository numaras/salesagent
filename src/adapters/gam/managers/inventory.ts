/**
 * Inventory discovery — GAM AdUnitService + CustomTargetingService stubs.
 */

import type { GamClientWrapper } from "../client.js";

/**
 * Discover ad units available in the GAM network.
 * TODO: Call AdUnitService.getAdUnitsByStatement once client exposes it.
 */
export async function discoverAdUnits(
  _client: GamClientWrapper
): Promise<{ adUnits: unknown[] }> {
  return { adUnits: [] };
}

/**
 * Retrieve custom targeting keys defined in GAM.
 * TODO: Call CustomTargetingService.getCustomTargetingKeysByStatement.
 */
export async function getCustomTargetingKeys(
  _client: GamClientWrapper
): Promise<{ keys: unknown[] }> {
  return { keys: [] };
}

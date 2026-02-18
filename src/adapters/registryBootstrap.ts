/**
 * Register Mock and GAM adapters with the core adapter registry.
 * Import and call registerAdapters() at app startup (e.g. run.ts or MCP server).
 */

import { registerAdapter, toPrincipal } from "../core/adapterRegistry.js";
import { ADAPTER_TYPES } from "../core/constants.js";
import type { AdapterConfigResult } from "../core/config/types.js";
import type { Principal } from "../types/adcp.js";
import { MockAdServer } from "./mock/index.js";
import { GoogleAdManager, createGamClient, getGamAdapterPrincipalId } from "./gam/index.js";
import type { GamConfig } from "./gam/types.js";

function mockFactory(
  config: AdapterConfigResult,
  principal: Principal,
  dryRun: boolean,
  _tenantId: string
) {
  const dryRunEffective = config.mockDryRun ?? dryRun;
  return new MockAdServer(
    {
      manual_approval_required: config.mockManualApprovalRequired ?? true,
      dry_run: dryRunEffective,
    },
    principal,
    dryRunEffective
  );
}

function gamFactory(
  config: AdapterConfigResult,
  principal: Principal,
  dryRun: boolean,
  _tenantId: string
) {
  const networkCode = config.gamNetworkCode ?? "";
  if (!networkCode) {
    throw new Error("GAM adapter requires gamNetworkCode in adapter config");
  }
  const gamConfig: GamConfig = {
    networkCode,
    advertiserId: getGamAdapterPrincipalId(principal) ?? null,
    traffickerId: config.gamTraffickerId ?? null,
    refreshToken: config.gamRefreshToken ?? null,
    serviceAccountJson: config.gamServiceAccountJson ?? null,
    dryRun: dryRun,
    manualApprovalRequired: config.gamManualApprovalRequired ?? true,
  };
  const clientWrapper = createGamClient(gamConfig);
  return new GoogleAdManager(gamConfig, principal, clientWrapper);
}

export function registerAdapters(): void {
  registerAdapter(ADAPTER_TYPES.MOCK, mockFactory);
  registerAdapter(ADAPTER_TYPES.GOOGLE_AD_MANAGER, gamFactory);
}

// Re-export for convenience
export { toPrincipal };

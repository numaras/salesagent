/**
 * Register adapters with the core adapter registry.
 * Import and call registerAdapters() at app startup (e.g. run.ts or MCP server).
 */

import { registerAdapter, toPrincipal } from "../core/adapterRegistry.js";
import { ADAPTER_TYPES } from "../core/constants.js";
import type { AdapterConfigResult } from "../core/config/types.js";
import type { Principal } from "../types/adcp.js";
import { MockAdServer } from "./mock/index.js";
import { GoogleAdManager, createGamClient, getGamAdapterPrincipalId } from "./gam/index.js";
import type { GamConfig } from "./gam/types.js";
import { KevelAdapter } from "./kevel/index.js";
import { TritonDigitalAdapter } from "./triton/index.js";
import { BroadstreetAdapter } from "./broadstreet/index.js";

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

function kevelFactory(
  config: AdapterConfigResult,
  principal: Principal,
  _dryRun: boolean,
  _tenantId: string
) {
  const networkId = (config.configJson.networkId as string) ?? "";
  const apiKey = (config.configJson.apiKey as string) ?? "";
  if (!networkId || !apiKey) {
    throw new Error("Kevel adapter requires networkId and apiKey in adapter configJson");
  }
  return new KevelAdapter(
    {
      networkId,
      apiKey,
      manualApprovalRequired: (config.configJson.manualApprovalRequired as boolean) ?? true,
    },
    principal
  );
}

function tritonFactory(
  config: AdapterConfigResult,
  principal: Principal,
  _dryRun: boolean,
  _tenantId: string
) {
  const stationId = (config.configJson.stationId as string) ?? "";
  const apiKey = (config.configJson.apiKey as string) ?? "";
  if (!stationId || !apiKey) {
    throw new Error("Triton Digital adapter requires stationId and apiKey in adapter configJson");
  }
  return new TritonDigitalAdapter({ stationId, apiKey }, principal);
}

function broadstreetFactory(
  config: AdapterConfigResult,
  principal: Principal,
  _dryRun: boolean,
  _tenantId: string
) {
  const networkId = (config.configJson.networkId as string) ?? "";
  const apiKey = (config.configJson.apiKey as string) ?? "";
  if (!networkId || !apiKey) {
    throw new Error("Broadstreet adapter requires networkId and apiKey in adapter configJson");
  }
  return new BroadstreetAdapter({ networkId, apiKey }, principal);
}

export function registerAdapters(): void {
  registerAdapter(ADAPTER_TYPES.MOCK, mockFactory);
  registerAdapter(ADAPTER_TYPES.GOOGLE_AD_MANAGER, gamFactory);
  registerAdapter(ADAPTER_TYPES.KEVEL, kevelFactory);
  registerAdapter(ADAPTER_TYPES.TRITON_DIGITAL, tritonFactory);
  registerAdapter(ADAPTER_TYPES.BROADSTREET, broadstreetFactory);
}

// Re-export for convenience
export { toPrincipal };

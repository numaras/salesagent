/**
 * Adapter registry: config-driven map (adapter_type → factory).
 * Core does not import concrete adapters; they register at startup.
 */

import type { AdapterConfigResult } from "./config/types.js";
import { getAdapterConfig } from "./config/configService.js";
import { ADAPTER_TYPES } from "./constants.js";
import type { PrincipalRow } from "../db/repositories/principal.js";
import type { AdServerAdapter } from "../adapters/base.js";
import type { Principal } from "../types/adcp.js";

export type PrincipalLike = Principal | (Pick<PrincipalRow, "principalId" | "name" | "platformMappings">);

/** Converts DB principal row to AdCP Principal for adapters. */
export function toPrincipal(row: PrincipalLike): Principal {
  if ("principal_id" in row && typeof (row as Principal).principal_id === "string") {
    return row as Principal;
  }
  const r = row as Pick<PrincipalRow, "principalId" | "name" | "platformMappings">;
  return {
    principal_id: r.principalId,
    name: r.name,
    platform_mappings: (r.platformMappings as Record<string, unknown>) ?? {},
  };
}

export type AdapterFactory = (
  config: AdapterConfigResult,
  principal: Principal,
  dryRun: boolean,
  tenantId: string
) => AdServerAdapter;

const registry = new Map<string, AdapterFactory>();

export function registerAdapter(adapterType: string, factory: AdapterFactory): void {
  registry.set(adapterType, factory);
}

/**
 * Get adapter for tenant. Loads AdapterConfig from DB and calls registered factory.
 * Returns Mock adapter for unknown/missing config (fallback).
 */
export async function getAdapter(
  tenantId: string,
  principal: PrincipalLike,
  dryRun: boolean
): Promise<AdServerAdapter> {
  const adapterConfig = await getAdapterConfig(tenantId);
  const principalNorm = toPrincipal(principal);

  const adapterType = adapterConfig?.adapterType ?? ADAPTER_TYPES.MOCK;
  const factory = registry.get(adapterType);

  if (factory) {
    const configToUse =
      adapterConfig ??
      ({
        tenantId,
        adapterType: ADAPTER_TYPES.MOCK,
        mockDryRun: dryRun,
        mockManualApprovalRequired: true,
        configJson: {},
      } as AdapterConfigResult);
    return factory(configToUse, principalNorm, dryRun, tenantId);
  }

  // Fallback: Mock adapter when no factory for this type
  const mockFactory = registry.get(ADAPTER_TYPES.MOCK);
  if (mockFactory) {
    const mockConfig: AdapterConfigResult = {
      tenantId,
      adapterType: ADAPTER_TYPES.MOCK,
      mockDryRun: dryRun,
      mockManualApprovalRequired: true,
      configJson: {},
    };
    return mockFactory(mockConfig, principalNorm, dryRun, tenantId);
  }

  throw new Error(
    "No adapter registered for type " + adapterType + ". Call registerAdapter at startup."
  );
}

export function getRegisteredTypes(): string[] {
  return Array.from(registry.keys());
}

/**
 * Build a Principal from ToolContext, using anonymous defaults if no principal is attached.
 * Eliminates the repeated `ctx.principal ? toPrincipal(...) : { ... }` pattern.
 */
export function ensurePrincipal(ctx: { principal?: PrincipalLike | null; principalId?: string | null }): Principal {
  if (ctx.principal) return toPrincipal(ctx.principal);
  return { principal_id: ctx.principalId ?? "", name: "anonymous", platform_mappings: {} };
}

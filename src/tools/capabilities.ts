/**
 * get_adcp_capabilities: returns agent capabilities (AdCP spec).
 */

import { getAdapter, ensurePrincipal } from "../core/adapterRegistry.js";
import type { ToolContext } from "../core/auth/types.js";
import type { GetAdcpCapabilitiesResponse } from "../types/adcp.js";
import { getSalesAgentUrl } from "../core/domainConfig.js";

export async function runGetAdcpCapabilities(
  ctx: ToolContext
): Promise<GetAdcpCapabilitiesResponse> {
  const adapter = await getAdapter(ctx.tenantId, ensurePrincipal(ctx), false);
  const targeting = adapter.get_targeting_capabilities();
  const channels = Array.from(
    "defaultChannels" in adapter && Array.isArray(adapter.defaultChannels)
      ? adapter.defaultChannels
      : ["display", "olv", "streaming_audio", "social"]
  );
  const salesUrl = getSalesAgentUrl("https") ?? getSalesAgentUrl("http") ?? "";
  return {
    adcp: { supported_protocols: ["mcp", "a2a"], major_version: 1 },
    media_buy: {
      execution: {
        targeting: Object.fromEntries(Object.entries(targeting).map(([k, v]) => [k, Boolean(v)])),
      },
      channels,
    },
    portfolio: { publisher_domain: salesUrl },
  };
}

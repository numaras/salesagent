import { getAdapter, ensurePrincipal } from "../core/adapterRegistry.js";
import type { TargetingCapabilities } from "../adapters/base.js";

export async function getTargetingCapabilities(
  tenantId: string
): Promise<TargetingCapabilities> {
  const principal = ensurePrincipal({});
  const adapter = await getAdapter(tenantId, principal, true);
  return adapter.get_targeting_capabilities();
}

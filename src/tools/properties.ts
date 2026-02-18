/**
 * list_authorized_properties: properties this agent is authorized to represent.
 * Shared implementation for MCP and A2A.
 */

import type { ToolContext } from "../core/auth/types.js";
import type {
  AuthorizedProperty,
  ListAuthorizedPropertiesResponse,
} from "../types/adcp.js";

export async function runListAuthorizedProperties(
  _ctx: ToolContext
): Promise<ListAuthorizedPropertiesResponse> {
  // Minimal implementation: return a single placeholder property per tenant.
  // Full implementation would query publisher_partners or authorized_properties table.
  return {
    properties: [
      {
        property_id: "all_inventory",
        name: "All inventory",
        domain: "",
      } as AuthorizedProperty,
    ],
  };
}

/**
 * list_authorized_properties: properties this agent is authorized to represent.
 * Shared implementation for MCP and A2A.
 */

import type { ToolContext } from "../core/auth/types.js";
import type {
  AuthorizedProperty,
  ListAuthorizedPropertiesResponse,
} from "../types/adcp.js";
import { getDb } from "../db/client.js";
import {
  listPropertiesByTenant,
  listPropertyTagsByTenant,
  listPublisherPartnersByTenant,
} from "../db/repositories/authorized-property.js";

export async function runListAuthorizedProperties(
  ctx: ToolContext
): Promise<ListAuthorizedPropertiesResponse> {
  const db = getDb();
  const [dbProperties, tags, partners] = await Promise.all([
    listPropertiesByTenant(db, ctx.tenantId),
    listPropertyTagsByTenant(db, ctx.tenantId),
    listPublisherPartnersByTenant(db, ctx.tenantId),
  ]);

  const properties: AuthorizedProperty[] = dbProperties.map((p) => ({
    property_id: p.propertyId,
    name: p.name,
    domain: p.publisherDomain,
    property_type: p.propertyType,
    verification_status: p.verificationStatus,
  }));

  for (const partner of partners) {
    const alreadyIncluded = properties.some(
      (p) => p.domain === partner.publisherDomain
    );
    if (!alreadyIncluded) {
      properties.push({
        property_id: `partner_${partner.id}`,
        name: partner.displayName ?? partner.publisherDomain,
        domain: partner.publisherDomain,
      });
    }
  }

  if (properties.length === 0) {
    properties.push({
      property_id: "all_inventory",
      name: "All inventory",
      domain: "",
    });
  }

  const tagList = tags.map((t) => ({ tag_id: t.tagId, name: t.name }));

  return { properties, tags: tagList };
}

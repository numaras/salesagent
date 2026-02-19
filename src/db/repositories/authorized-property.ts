import { eq } from "drizzle-orm";
import type { DrizzleDb } from "../client.js";
import { authorizedProperties, propertyTags, publisherPartners } from "../schema.js";

export type AuthorizedPropertyRow = typeof authorizedProperties.$inferSelect;
export type PropertyTagRow = typeof propertyTags.$inferSelect;
export type PublisherPartnerRow = typeof publisherPartners.$inferSelect;

export async function listPropertiesByTenant(db: DrizzleDb, tenantId: string): Promise<AuthorizedPropertyRow[]> {
  return db.select().from(authorizedProperties).where(eq(authorizedProperties.tenantId, tenantId));
}

export async function listPropertyTagsByTenant(db: DrizzleDb, tenantId: string): Promise<PropertyTagRow[]> {
  return db.select().from(propertyTags).where(eq(propertyTags.tenantId, tenantId));
}

export async function listPublisherPartnersByTenant(db: DrizzleDb, tenantId: string): Promise<PublisherPartnerRow[]> {
  return db.select().from(publisherPartners).where(eq(publisherPartners.tenantId, tenantId));
}

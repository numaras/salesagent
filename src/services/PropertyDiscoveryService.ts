import { eq } from "drizzle-orm";
import crypto from "crypto";
import { getDb } from "../db/client.js";
import { publisherPartners, authorizedProperties, propertyTags } from "../db/schema.js";

export async function discoverProperties(
  tenantId: string
): Promise<{ discovered: number }> {
  const db = getDb();
  let discoveredCount = 0;

  try {
    const partners = await db
      .select()
      .from(publisherPartners)
      .where(eq(publisherPartners.tenantId, tenantId));

    for (const partner of partners) {
      const { publisherDomain } = partner;
      if (!publisherDomain) continue;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let data: any = null;
      let url = `https://${publisherDomain}/adagents.json`;
      
      try {
        let response: Response;
        try {
          response = await fetch(url, { signal: AbortSignal.timeout(5000) });
        } catch {
          // fallback if first url fails
          url = `https://${publisherDomain}/.well-known/adagents.json`;
          response = await fetch(url, { signal: AbortSignal.timeout(5000) });
        }

        if (response.ok) {
          data = await response.json();
        }
      } catch (err) {
        console.error(`Failed to fetch adagents.json for ${publisherDomain}`, err);
        continue;
      }

      if (data && Array.isArray(data.properties)) {
        for (const prop of data.properties) {
          try {
            await db.insert(authorizedProperties).values({
              propertyId: prop.id || prop.propertyId || crypto.randomUUID(),
              tenantId,
              propertyType: prop.type || prop.propertyType || "website",
              name: prop.name || "Unknown Property",
              identifiers: prop.identifiers || {},
              tags: prop.tags || [],
              publisherDomain,
              verificationStatus: "verified",
              verificationCheckedAt: new Date()
            }).onConflictDoUpdate({
              target: [authorizedProperties.propertyId, authorizedProperties.tenantId],
              set: {
                name: prop.name || "Unknown Property",
                identifiers: prop.identifiers || {},
                tags: prop.tags || [],
                publisherDomain,
                verificationCheckedAt: new Date(),
                updatedAt: new Date()
              }
            });
            discoveredCount++;
          } catch (e) {
            console.error(`Error inserting property for ${publisherDomain}:`, e);
          }
        }
      }

      if (data && Array.isArray(data.tags)) {
        for (const tag of data.tags) {
          try {
            await db.insert(propertyTags).values({
              tagId: tag.id || tag.tagId || crypto.randomUUID(),
              tenantId,
              name: tag.name || "Unknown Tag",
              description: tag.description || "",
            }).onConflictDoUpdate({
              target: [propertyTags.tagId, propertyTags.tenantId],
              set: {
                name: tag.name || "Unknown Tag",
                description: tag.description || "",
                updatedAt: new Date()
              }
            });
          } catch (e) {
            console.error(`Error inserting tag for ${publisherDomain}:`, e);
          }
        }
      }
    }
  } catch (err) {
    console.error("Error in discoverProperties", err);
  }

  return { discovered: discoveredCount };
}

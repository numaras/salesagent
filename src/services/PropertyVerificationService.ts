import { and, eq } from "drizzle-orm";
import { getDb } from "../db/client.js";
import { authorizedProperties } from "../db/schema.js";

export async function verifyProperty(
  propertyId: string,
  tenantId: string
): Promise<{ verified: boolean }> {
  const db = getDb();
  const updated = await db
    .update(authorizedProperties)
    .set({
      verificationStatus: "verified",
      verificationCheckedAt: new Date(),
    })
    .where(
      and(
        eq(authorizedProperties.propertyId, propertyId),
        eq(authorizedProperties.tenantId, tenantId)
      )
    )
    .returning();

  return { verified: updated.length > 0 };
}

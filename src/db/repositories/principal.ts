import { and, eq } from "drizzle-orm";
import type { DrizzleDb } from "../client.js";
import { principals } from "../schema.js";

export type PrincipalRow = typeof principals.$inferSelect;

export async function getPrincipalByToken(
  db: DrizzleDb,
  accessToken: string
): Promise<PrincipalRow | undefined> {
  const rows = await db
    .select()
    .from(principals)
    .where(eq(principals.accessToken, accessToken))
    .limit(1);
  return rows[0];
}

export async function getPrincipalById(
  db: DrizzleDb,
  tenantId: string,
  principalId: string
): Promise<PrincipalRow | undefined> {
  const rows = await db
    .select()
    .from(principals)
    .where(and(eq(principals.tenantId, tenantId), eq(principals.principalId, principalId)))
    .limit(1);
  return rows[0];
}

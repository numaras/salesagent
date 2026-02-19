import { and, eq } from "drizzle-orm";
import type { DrizzleDb } from "../client.js";
import { creativeAgents, signalsAgents } from "../schema.js";

export type CreativeAgentRow = typeof creativeAgents.$inferSelect;
export type SignalsAgentRow = typeof signalsAgents.$inferSelect;

export async function listCreativeAgentsByTenant(db: DrizzleDb, tenantId: string): Promise<CreativeAgentRow[]> {
  return db.select().from(creativeAgents).where(and(eq(creativeAgents.tenantId, tenantId), eq(creativeAgents.enabled, true)));
}

export async function listSignalsAgentsByTenant(db: DrizzleDb, tenantId: string): Promise<SignalsAgentRow[]> {
  return db.select().from(signalsAgents).where(and(eq(signalsAgents.tenantId, tenantId), eq(signalsAgents.enabled, true)));
}

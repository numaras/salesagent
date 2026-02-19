import { and, eq } from "drizzle-orm";
import type { DrizzleDb } from "../client.js";
import { users } from "../schema.js";

export type UserRow = typeof users.$inferSelect;
export type UserInsert = typeof users.$inferInsert;

export async function getUserById(db: DrizzleDb, userId: string): Promise<UserRow | undefined> {
  const rows = await db.select().from(users).where(eq(users.userId, userId)).limit(1);
  return rows[0];
}

export async function listUsersByTenant(db: DrizzleDb, tenantId: string): Promise<UserRow[]> {
  return db.select().from(users).where(eq(users.tenantId, tenantId));
}

export async function getUserByEmail(db: DrizzleDb, tenantId: string, email: string): Promise<UserRow | undefined> {
  const rows = await db.select().from(users).where(and(eq(users.tenantId, tenantId), eq(users.email, email))).limit(1);
  return rows[0];
}

export async function insertUser(db: DrizzleDb, row: UserInsert): Promise<UserRow> {
  const inserted = await db.insert(users).values(row).returning();
  return inserted[0]!;
}

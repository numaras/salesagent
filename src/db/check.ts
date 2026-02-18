/**
 * Check DB connection (no migrations). Run: npm run db:check
 */

import { getDb } from "./client.js";
import { sql } from "drizzle-orm";

async function main(): Promise<void> {
  const db = getDb();
  await db.execute(sql`SELECT 1`);
  console.log("Database connection OK.");
}

main().catch((err) => {
  console.error("Database check failed:", err);
  process.exit(1);
});

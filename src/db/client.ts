/**
 * Database client and transaction helper.
 * Uses existing PostgreSQL; no schema generation (DB already exists).
 */

import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema.js";

const { Pool } = pg;

let pool: pg.Pool | null = null;

function getPool(): pg.Pool {
  if (!pool) {
    const connectionString =
      process.env.DATABASE_URL ||
      "postgresql://localhost:5432/salesagent?user=salesagent&password=salesagent";
    pool = new Pool({ connectionString, max: 10 });
  }
  return pool;
}

export type DrizzleDb = ReturnType<typeof drizzle>;

export function getDb(): DrizzleDb {
  return drizzle(getPool(), { schema });
}

/**
 * Run a callback inside a transaction.
 * For create_media_buy-style flows that need multi-entity writes.
 * The callback receives a db-like object that supports select/insert/update/delete.
 */
export async function withTransaction<T>(
  fn: (tx: DrizzleDb) => Promise<T>
): Promise<T> {
  const db = getDb();
  return db.transaction(async (tx) => fn(tx as unknown as DrizzleDb));
}

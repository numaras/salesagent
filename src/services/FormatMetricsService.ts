import { eq } from "drizzle-orm";
import { getDb } from "../db/client.js";
import { formatPerformanceMetrics } from "../db/schema.js";

type FormatMetricRow = typeof formatPerformanceMetrics.$inferSelect;

export async function getFormatMetrics(
  tenantId: string
): Promise<FormatMetricRow[]> {
  const db = getDb();
  return db
    .select()
    .from(formatPerformanceMetrics)
    .where(eq(formatPerformanceMetrics.tenantId, tenantId));
}

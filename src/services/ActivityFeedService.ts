import { desc, eq } from "drizzle-orm";
import { getDb } from "../db/client.js";
import { auditLogs } from "../db/schema.js";

export interface ActivityItem {
  operation: string;
  principalName: string | null;
  success: boolean;
  timestamp: string | null;
  details: unknown;
}

export async function getRecentActivity(
  tenantId: string,
  limit = 20
): Promise<ActivityItem[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(auditLogs)
    .where(eq(auditLogs.tenantId, tenantId))
    .orderBy(desc(auditLogs.timestamp))
    .limit(limit);

  return rows.map((r) => ({
    operation: r.operation,
    principalName: r.principalName,
    success: r.success,
    timestamp: r.timestamp?.toISOString() ?? null,
    details: r.details,
  }));
}

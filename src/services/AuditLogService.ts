/**
 * Audit logging: records operations for compliance and debugging.
 */

import { getDb } from "../db/client.js";
import { insertAuditLog } from "../db/repositories/audit-log.js";
import type { AuditLogRow } from "../db/repositories/audit-log.js";

export async function logOperation(
  tenantId: string,
  operation: string,
  principalId: string | null,
  principalName: string | null,
  success: boolean,
  details?: Record<string, unknown>,
  errorMessage?: string
): Promise<AuditLogRow> {
  const db = getDb();
  return insertAuditLog(db, {
    tenantId,
    operation,
    principalId,
    principalName,
    success,
    details: details ?? null,
    errorMessage: errorMessage ?? null,
  });
}

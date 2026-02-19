/**
 * Policy compliance checking for tenant-level content/request policies.
 */

import { getDb } from "../db/client.js";
import { getTenantById } from "../db/repositories/tenant.js";
import { NotFoundError } from "../core/errors.js";

export interface PolicyRequest {
  advertiserName?: string;
  orderName?: string;
  keywords?: string[];
  [key: string]: unknown;
}

export interface PolicyResult {
  allowed: boolean;
  violations: string[];
}

const DEFAULT_BLOCKED_KEYWORDS = [
  "gambling",
  "tobacco",
  "firearms",
  "adult",
  "cryptocurrency",
];

export async function checkPolicy(
  tenantId: string,
  request: PolicyRequest
): Promise<PolicyResult> {
  const db = getDb();
  const tenant = await getTenantById(db, tenantId);
  if (!tenant) throw new NotFoundError("Tenant", tenantId);

  const blockedKeywords = DEFAULT_BLOCKED_KEYWORDS;

  // TODO: Replace keyword matching with AI-based policy checking (e.g. LLM content review)
  const violations: string[] = [];
  const fieldsToCheck = [
    request.advertiserName,
    request.orderName,
    ...(request.keywords ?? []),
  ].filter(Boolean) as string[];

  for (const field of fieldsToCheck) {
    const lower = field.toLowerCase();
    for (const keyword of blockedKeywords) {
      if (lower.includes(keyword)) {
        violations.push(`Blocked keyword "${keyword}" found in "${field}"`);
      }
    }
  }

  return { allowed: violations.length === 0, violations };
}

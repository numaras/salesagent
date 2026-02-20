/**
 * Policy compliance checking for tenant-level content/request policies.
 */

import { getDb } from "../db/client.js";
import { getTenantById } from "../db/repositories/tenant.js";
import { NotFoundError } from "../core/errors.js";
import { getAiConfig } from "./ai/config.js";
import { checkPolicyCompliance } from "./ai/agents/policyAgent.js";

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

export async function checkPolicy(
  tenantId: string,
  request: PolicyRequest
): Promise<PolicyResult> {
  const db = getDb();
  const tenant = await getTenantById(db, tenantId);
  if (!tenant) throw new NotFoundError("Tenant", tenantId);

  const aiConfig = await getAiConfig(tenantId);
  if (!aiConfig) {
    // Fallback if no AI config
    return { allowed: true, violations: [] };
  }

  const policiesObj = (tenant.policies as Record<string, unknown>) ?? {};
  const rules = policiesObj.advertising_policy 
    ? JSON.stringify(policiesObj.advertising_policy)
    : "No gambling, tobacco, firearms, adult content, or cryptocurrency.";

  const description = `Order: ${request.orderName ?? "Unknown"}, Keywords: ${(request.keywords ?? []).join(", ")}`;

  const result = await checkPolicyCompliance(
    aiConfig,
    request.advertiserName ?? "Unknown",
    description,
    rules
  );

  return {
    allowed: result.compliant,
    violations: result.violations,
  };
}

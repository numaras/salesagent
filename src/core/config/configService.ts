/**
 * Config service: tenant config and adapter config from DB + env.
 */

import { getDb } from "../../db/client.js";
import { getAdapterConfigByTenant } from "../../db/repositories/adapter-config.js";
import { getTenantById } from "../../db/repositories/tenant.js";
import { DEFAULT_TENANT_ID } from "../constants.js";
import type { AdapterConfigResult, TenantConfig } from "./types.js";

function isActive(row: { isActive?: boolean | null }): boolean {
  return row.isActive === true;
}

export async function getTenantConfig(tenantId: string): Promise<TenantConfig | null> {
  const db = getDb();
  const row = await getTenantById(db, tenantId);
  if (!row || !isActive(row)) return null;

  const dryRun =
    process.env.ADCP_DRY_RUN?.toLowerCase() === "true";
  return {
    tenantId: row.tenantId,
    name: row.name,
    subdomain: row.subdomain,
    adServer: row.adServer ?? undefined,
    adminToken: row.adminToken ?? null,
    geminiApiKey: process.env.GEMINI_API_KEY,
    dryRun,
    autoApproveFormatIds: undefined,
    humanReviewRequired: true,
    maxDailyBudget: 10000,
    enableAxeSignals: true,
    slackWebhookUrl: null,
    slackAuditWebhookUrl: null,
    hitlWebhookUrl: null,
    policySettings: null,
  };
}

export async function getAdapterConfig(tenantId: string): Promise<AdapterConfigResult | null> {
  const db = getDb();
  const row = await getAdapterConfigByTenant(db, tenantId);
  if (!row) return null;

  return {
    tenantId: row.tenantId,
    adapterType: row.adapterType,
    mockDryRun: row.mockDryRun,
    mockManualApprovalRequired: row.mockManualApprovalRequired ?? false,
    gamNetworkCode: row.gamNetworkCode,
    gamRefreshToken: row.gamRefreshToken,
    gamServiceAccountJson: row.gamServiceAccountJson,
    gamTraffickerId: row.gamTraffickerId,
    gamManualApprovalRequired: row.gamManualApprovalRequired ?? false,
    configJson: (row.configJson as Record<string, unknown>) ?? {},
  };
}

export async function getDefaultTenantId(): Promise<string | null> {
  const config = await getTenantConfig(DEFAULT_TENANT_ID);
  return config ? DEFAULT_TENANT_ID : null;
}

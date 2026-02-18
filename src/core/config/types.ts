/**
 * Config types: tenant config and adapter config for tool/adapter use.
 */

export interface TenantConfig {
  tenantId: string;
  name: string;
  subdomain: string;
  adServer?: string;
  adminToken?: string | null;
  /** From env GEMINI_API_KEY */
  geminiApiKey?: string;
  /** From env ADCP_DRY_RUN */
  dryRun: boolean;
  /** For backward compatibility / feature flags */
  autoApproveFormatIds?: string[];
  humanReviewRequired?: boolean;
  maxDailyBudget?: number;
  enableAxeSignals?: boolean;
  slackWebhookUrl?: string | null;
  slackAuditWebhookUrl?: string | null;
  hitlWebhookUrl?: string | null;
  policySettings?: Record<string, unknown> | null;
}

export interface AdapterConfigResult {
  tenantId: string;
  adapterType: string;
  mockDryRun?: boolean | null;
  mockManualApprovalRequired?: boolean;
  gamNetworkCode?: string | null;
  gamRefreshToken?: string | null;
  gamServiceAccountJson?: string | null;
  gamTraffickerId?: string | null;
  gamManualApprovalRequired?: boolean;
  configJson: Record<string, unknown>;
}

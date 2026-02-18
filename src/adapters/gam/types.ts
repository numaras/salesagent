/**
 * GAM adapter config and principal helpers.
 * Credentials: env GAM_OAUTH_CLIENT_ID, GAM_OAUTH_CLIENT_SECRET; config supplies refresh_token or service_account_json.
 */

import type { Principal } from "../../types/adcp.js";

/** Config passed to GoogleAdManager adapter (from tenant/DB or test fixtures). */
export interface GamConfig {
  networkCode: string;
  advertiserId: string | null;
  traffickerId: string | null;
  refreshToken?: string | null;
  serviceAccountJson?: string | null;
  /** Legacy: path to key file (optional). */
  serviceAccountKeyFile?: string | null;
  dryRun?: boolean;
  manualApprovalRequired?: boolean;
}

/** Get GAM advertiser ID from principal platform_mappings (google_ad_manager or gam_advertiser_id). */
export function getGamAdapterPrincipalId(principal: Principal): string | undefined {
  const gam = principal.platform_mappings["google_ad_manager"];
  if (gam && typeof gam === "object" && "advertiser_id" in gam) {
    return String((gam as Record<string, unknown>).advertiser_id);
  }
  const root = principal.platform_mappings["gam_advertiser_id"];
  if (root != null) {
    return String(root);
  }
  return undefined;
}

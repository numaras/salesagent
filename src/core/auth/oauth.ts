/**
 * OAuth/OIDC: Google OAuth, generic OIDC discovery, GAM OAuth, test mode.
 * Tenant-specific OIDC via tenant_auth_configs table.
 */

import { getDb } from "../../db/client.js";
import { tenantAuthConfigs } from "../../db/schema.js";
import { eq } from "drizzle-orm";
import { isUrlSafeWithDns } from "../security/ssrf.js";

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  discoveryUrl?: string;
  scopes: string[];
  redirectUri: string;
}

export interface OidcDiscovery {
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint: string;
  end_session_endpoint?: string;
  issuer: string;
}

export async function getOidcConfigForTenant(tenantId: string): Promise<{
  enabled: boolean;
  provider?: string;
  discoveryUrl?: string;
  clientId?: string;
  clientSecretEncrypted?: string;
  scopes?: string;
  logoutUrl?: string;
} | null> {
  const db = getDb();
  const rows = await db.select().from(tenantAuthConfigs).where(eq(tenantAuthConfigs.tenantId, tenantId)).limit(1);
  const row = rows[0];
  if (!row) return null;
  return {
    enabled: row.oidcEnabled,
    provider: row.oidcProvider ?? undefined,
    discoveryUrl: row.oidcDiscoveryUrl ?? undefined,
    clientId: row.oidcClientId ?? undefined,
    clientSecretEncrypted: row.oidcClientSecretEncrypted ?? undefined,
    scopes: row.oidcScopes ?? "openid email profile",
    logoutUrl: row.oidcLogoutUrl ?? undefined,
  };
}

export async function fetchOidcDiscovery(discoveryUrl: string): Promise<OidcDiscovery> {
  if (!(await isUrlSafeWithDns(discoveryUrl))) {
    throw new Error("OIDC discovery URL blocked by SSRF policy");
  }
  const res = await fetch(discoveryUrl);
  if (!res.ok) throw new Error("OIDC discovery failed: " + res.status);
  return res.json() as Promise<OidcDiscovery>;
}

export function buildGoogleOAuthUrl(config: OAuthConfig, state: string): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: config.scopes.join(" "),
    state,
    access_type: "offline",
    prompt: "consent",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export async function exchangeCodeForTokens(
  tokenEndpoint: string,
  code: string,
  config: OAuthConfig
): Promise<{ access_token: string; id_token?: string; refresh_token?: string }> {
  if (!(await isUrlSafeWithDns(tokenEndpoint))) {
    throw new Error("OIDC token endpoint blocked by SSRF policy");
  }
  const res = await fetch(tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: config.redirectUri,
      client_id: config.clientId,
      client_secret: config.clientSecret,
    }),
  });
  if (!res.ok) {
    const errorBody = await res.text().catch(() => "");
    throw new Error(`Token exchange failed (${res.status}): ${errorBody}`);
  }
  return res.json() as Promise<{ access_token: string; id_token?: string; refresh_token?: string }>;
}

export async function fetchUserInfo(
  userinfoEndpoint: string,
  accessToken: string
): Promise<{ email: string; name?: string; sub?: string; picture?: string }> {
  if (!(await isUrlSafeWithDns(userinfoEndpoint))) {
    throw new Error("OIDC userinfo endpoint blocked by SSRF policy");
  }
  const res = await fetch(userinfoEndpoint, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error("Userinfo fetch failed: " + res.status);
  return res.json() as Promise<{ email: string; name?: string; sub?: string; picture?: string }>;
}

export function isTestModeEnabled(): boolean {
  return process.env.ADCP_AUTH_TEST_MODE?.toLowerCase() === "true";
}

export function validateTestCredentials(password: string): boolean {
  return isTestModeEnabled() && password === "test123";
}

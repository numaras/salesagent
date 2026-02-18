/**
 * Domain configuration utilities.
 *
 * Ported from python_src/src/core/domain_config.py
 * Centralized domain configuration via environment variables (vendor-neutral).
 * In multi-tenant mode, SALES_AGENT_DOMAIN must be set.
 */

function isLocalhost(domain: string | null | undefined): boolean {
  if (!domain) return false;
  const host = domain.split(":")[0];
  return host === "localhost" || host === "127.0.0.1";
}

function getProtocolForDomain(domain: string | null | undefined): string {
  return isLocalhost(domain) ? "http" : "https";
}

/**
 * Get the sales agent domain (e.g. sales-agent.example.com).
 * Returns the configured SALES_AGENT_DOMAIN, or undefined if not set.
 */
export function getSalesAgentDomain(): string | undefined {
  return process.env.SALES_AGENT_DOMAIN ?? undefined;
}

/**
 * Get the admin domain (e.g. admin.sales-agent.example.com).
 * Uses ADMIN_DOMAIN if set, otherwise admin.{SALES_AGENT_DOMAIN}.
 */
export function getAdminDomain(): string | undefined {
  const adminDomain = process.env.ADMIN_DOMAIN;
  if (adminDomain) return adminDomain;
  const salesDomain = getSalesAgentDomain();
  if (salesDomain) return `admin.${salesDomain}`;
  return undefined;
}

/**
 * Get the domain for super admin emails (e.g. example.com).
 */
export function getSuperAdminDomain(): string | undefined {
  return process.env.SUPER_ADMIN_DOMAIN ?? undefined;
}

/**
 * Get the full sales agent URL (e.g. https://sales-agent.example.com).
 */
export function getSalesAgentUrl(protocol: string = "https"): string | undefined {
  const domain = getSalesAgentDomain();
  if (!domain) return undefined;
  return `${protocol}://${domain}`;
}

/**
 * Get the full admin URL (e.g. https://admin.sales-agent.example.com).
 */
export function getAdminUrl(protocol: string = "https"): string | undefined {
  const domain = getAdminDomain();
  if (!domain) return undefined;
  return `${protocol}://${domain}`;
}

/**
 * Get the A2A server URL (e.g. https://sales-agent.example.com/a2a).
 * If protocol is not provided, auto-detects (http for localhost, https otherwise).
 */
export function getA2aServerUrl(protocol: string | null = null): string | undefined {
  const domain = getSalesAgentDomain();
  if (!domain) return undefined;
  const proto = protocol ?? getProtocolForDomain(domain);
  const url = getSalesAgentUrl(proto);
  if (!url) return undefined;
  return `${url}/a2a`;
}

/**
 * Get the MCP server URL (e.g. https://sales-agent.example.com/mcp).
 */
export function getMcpServerUrl(protocol: string = "https"): string | undefined {
  const url = getSalesAgentUrl(protocol);
  if (!url) return undefined;
  return `${url}/mcp`;
}

/**
 * Check if the given host is part of the sales agent domain.
 */
export function isSalesAgentDomain(host: string): boolean {
  const salesDomain = getSalesAgentDomain();
  if (!salesDomain) return false;
  return host === salesDomain || host.endsWith(`.${salesDomain}`);
}

/**
 * Check if the given host is the admin domain.
 */
export function isAdminDomain(host: string): boolean {
  const adminDomain = getAdminDomain();
  if (!adminDomain) return false;
  return host === adminDomain || host.startsWith(`${adminDomain}:`);
}

/**
 * Extract the subdomain from a host if it's a sales agent domain.
 * E.g. "tenant.sales-agent.example.com" -> "tenant".
 */
export function extractSubdomainFromHost(host: string): string | undefined {
  const salesDomain = getSalesAgentDomain();
  if (!salesDomain) return undefined;
  const suffix = `.${salesDomain}`;
  if (host.includes(suffix)) return host.split(suffix)[0] ?? undefined;
  return undefined;
}

/**
 * Get the URL for a specific tenant subdomain.
 */
export function getTenantUrl(subdomain: string, protocol: string = "https"): string | undefined {
  const salesDomain = getSalesAgentDomain();
  if (!salesDomain) return undefined;
  return `${protocol}://${subdomain}.${salesDomain}`;
}

/**
 * Get the OAuth redirect URI (legacy env-based).
 * Prefer ADMIN_UI_URL in auth_config_service for per-tenant OIDC.
 */
export function getOauthRedirectUri(protocol: string = "https"): string | undefined {
  const envUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;
  if (envUri) return envUri;
  const url = getSalesAgentUrl(protocol);
  if (!url) return undefined;
  return `${url}/admin/auth/google/callback`;
}

/**
 * Get the session cookie domain (with leading dot for subdomain sharing).
 */
export function getSessionCookieDomain(): string | undefined {
  const salesDomain = getSalesAgentDomain();
  if (!salesDomain) return undefined;
  return `.${salesDomain}`;
}

/**
 * Get the support email for user-facing messages.
 */
export function getSupportEmail(): string {
  return process.env.SUPPORT_EMAIL ?? "support@example.com";
}

/**
 * Domain routing utilities for landing pages, MCP, and A2A URLs.
 * Ported from python_src domain routing logic.
 * Builds tenant-specific URLs using the central domainConfig.
 */

import { getSalesAgentUrl, getSalesAgentDomain } from "./domainConfig.js";

/**
 * Resolve the landing page URL for a tenant.
 * If a subdomain is provided, builds a subdomain-based URL;
 * otherwise falls back to path-based tenant routing.
 */
export function resolveLandingUrl(
  tenantId: string,
  subdomain?: string
): string | undefined {
  const domain = getSalesAgentDomain();
  if (!domain) return undefined;

  const isLocal =
    domain.split(":")[0] === "localhost" ||
    domain.split(":")[0] === "127.0.0.1";
  const protocol = isLocal ? "http" : "https";

  if (subdomain) {
    return `${protocol}://${subdomain}.${domain}`;
  }

  const baseUrl = getSalesAgentUrl(protocol);
  if (!baseUrl) return undefined;
  return `${baseUrl}/tenant/${tenantId}`;
}

/**
 * Build the MCP endpoint URL for a specific tenant.
 */
export function getMcpUrl(tenantId: string): string | undefined {
  const landing = resolveLandingUrl(tenantId);
  if (!landing) return undefined;
  return `${landing}/mcp/`;
}

/**
 * Build the A2A endpoint URL for a specific tenant.
 */
export function getA2aUrl(tenantId: string): string | undefined {
  const landing = resolveLandingUrl(tenantId);
  if (!landing) return undefined;
  return `${landing}/a2a`;
}

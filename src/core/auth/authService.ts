/**
 * Auth service: resolve tenant from Host/headers, principal from x-adcp-auth or Bearer.
 * Returns ToolContext for use by tools; no direct header/DB access in tools.
 */

import { getDb } from "../../db/client.js";
import {
  getPrincipalByToken,
  getPrincipalById,
} from "../../db/repositories/principal.js";
import {
  getTenantById,
  getTenantBySubdomain,
  getTenantByVirtualHost,
} from "../../db/repositories/tenant.js";
import { BEARER_PREFIX, DEFAULT_TENANT_ID, HEADER_NAMES } from "../constants.js";
import { getHeaderCaseInsensitive } from "../httpHeaders.js";
import type { HeadersLike } from "../httpHeaders.js";
import type { ToolContext } from "./types.js";

export interface ResolveResult {
  tenantId: string | null;
  principalId: string | null;
  principal: ToolContext["principal"];
  isAdminToken: boolean;
  /** Serialized tenant/config for context (minimal) */
  tenantContext: { tenantId: string } | null;
}

function normalizeToken(value: string | undefined): string | undefined {
  if (!value || typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (trimmed.toLowerCase().startsWith(BEARER_PREFIX)) {
    return trimmed.slice(BEARER_PREFIX.length).trim();
  }
  return trimmed;
}

/**
 * Resolve tenant from headers (Host, x-adcp-tenant, apx-incoming-host, localhost fallback).
 */
export async function resolveTenantFromHeaders(
  headers: HeadersLike
): Promise<{ tenantId: string; subdomain?: string } | null> {
  const host = getHeaderCaseInsensitive(headers, HEADER_NAMES.HOST) ?? "";
  const apxHost = getHeaderCaseInsensitive(headers, HEADER_NAMES.APX_INCOMING_HOST);
  const tenantHint = getHeaderCaseInsensitive(headers, HEADER_NAMES.X_ADCP_TENANT);

  const db = getDb();

  // 1. Virtual host (host or apx-incoming-host)
  const hostForVhost = host.split(":")[0] ?? "";
  const byVhost =
    hostForVhost ? await getTenantByVirtualHost(db, hostForVhost) : undefined;
  const tenantByVhost = byVhost ?? (apxHost ? await getTenantByVirtualHost(db, apxHost) : undefined);
  if (tenantByVhost?.tenantId) {
    return { tenantId: tenantByVhost.tenantId, subdomain: tenantByVhost.subdomain };
  }

  // 2. Subdomain from Host
  const subdomain = host.includes(".") ? host.split(".")[0] : null;
  const skipSubdomains = ["localhost", "adcp-sales-agent", "www", "admin"];
  if (subdomain && !skipSubdomains.includes(subdomain.toLowerCase())) {
    const tenantBySub = await getTenantBySubdomain(db, subdomain);
    if (tenantBySub?.tenantId) {
      return { tenantId: tenantBySub.tenantId, subdomain };
    }
  }

  // 3. x-adcp-tenant (as subdomain or tenant_id)
  if (tenantHint) {
    const bySub = await getTenantBySubdomain(db, tenantHint);
    if (bySub?.tenantId) return { tenantId: bySub.tenantId, subdomain: tenantHint };
    const byId = await getTenantById(db, tenantHint);
    if (byId?.tenantId) return { tenantId: byId.tenantId };
  }

  // 4. Localhost fallback -> default tenant
  const hostname = host.split(":")[0]?.toLowerCase() ?? "";
  if (["localhost", "127.0.0.1", "localhost.localdomain"].includes(hostname)) {
    const defaultTenant = await getTenantBySubdomain(db, "default");
    if (defaultTenant?.tenantId) {
      return { tenantId: defaultTenant.tenantId, subdomain: DEFAULT_TENANT_ID };
    }
  }

  return null;
}

/**
 * Resolve principal from token (x-adcp-auth or Authorization: Bearer).
 * If tenantId is provided, only looks in that tenant and accepts admin token.
 */
export async function resolvePrincipalFromToken(
  headers: HeadersLike,
  tenantId: string | null
): Promise<{
  principalId: string | null;
  principal: ResolveResult["principal"];
  isAdminToken: boolean;
}> {
  const adcpAuth = getHeaderCaseInsensitive(headers, HEADER_NAMES.X_ADCP_AUTH);
  const authHeader = getHeaderCaseInsensitive(headers, HEADER_NAMES.AUTHORIZATION);
  const token = normalizeToken(adcpAuth ?? authHeader);
  if (!token) {
    return { principalId: null, principal: null, isAdminToken: false };
  }

  const db = getDb();

  if (tenantId) {
    const principal = await getPrincipalByToken(db, token);
    if (principal && principal.tenantId === tenantId) {
      return {
        principalId: principal.principalId,
        principal,
        isAdminToken: false,
      };
    }
    // Admin token for this tenant
    const tenantRow = await getTenantById(db, tenantId);
    if (tenantRow?.adminToken === token && tenantRow.isActive) {
      return {
        principalId: `${tenantId}_admin`,
        principal: null,
        isAdminToken: true,
      };
    }
    return { principalId: null, principal: null, isAdminToken: false };
  }

  // Global lookup by token
  const principal = await getPrincipalByToken(db, token);
  if (!principal) {
    return { principalId: null, principal: null, isAdminToken: false };
  }
  const tenantRow = await getTenantById(db, principal.tenantId);
  if (!tenantRow?.isActive) {
    return { principalId: null, principal: null, isAdminToken: false };
  }
  return {
    principalId: principal.principalId,
    principal,
    isAdminToken: false,
  };
}

/**
 * Resolve full tool context from headers: tenant + principal.
 * Call this once per request and pass the result to tools.
 */
export async function resolveFromHeaders(headers: HeadersLike): Promise<ResolveResult> {
  const tenant = await resolveTenantFromHeaders(headers);
  let tenantId = tenant?.tenantId ?? null;
  let tenantContext: { tenantId: string } | null = tenantId ? { tenantId } : null;

  const { principalId, principal, isAdminToken } = await resolvePrincipalFromToken(
    headers,
    tenantId
  );

  // If no tenant from headers but we found principal (global token lookup), use principal's tenant
  if (!tenantId && principal) {
    tenantId = principal.tenantId;
    tenantContext = { tenantId };
  }

  return {
    tenantId,
    principalId,
    principal: principal ?? null,
    isAdminToken,
    tenantContext,
  };
}

/**
 * Build ToolContext for tools. Call after resolveFromHeaders; use tenantId from
 * resolution (or throw if required and missing).
 */
export function toToolContext(result: ResolveResult): ToolContext | null {
  if (!result.tenantId) return null;
  return {
    tenantId: result.tenantId,
    principalId: result.principalId,
    principal: result.principal,
    isAdminToken: result.isAdminToken,
  };
}

/**
 * Get principal by ids (e.g. for internal use when you already have tenantId/principalId).
 */
export async function getPrincipal(
  tenantId: string,
  principalId: string
): Promise<ToolContext["principal"]> {
  const db = getDb();
  const p = await getPrincipalById(db, tenantId, principalId);
  return p ?? null;
}

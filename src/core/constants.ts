/**
 * Shared constants: adapter types, header names, default tenant.
 * Use everywhere to avoid hardcoded strings.
 */

export const ADAPTER_TYPES = {
  MOCK: "mock",
  GOOGLE_AD_MANAGER: "google_ad_manager",
  KEVEL: "kevel",
  TRITON_DIGITAL: "triton_digital",
  BROADSTREET: "broadstreet",
} as const;

export type AdapterType = (typeof ADAPTER_TYPES)[keyof typeof ADAPTER_TYPES];

export const HEADER_NAMES = {
  /** Preferred AdCP auth header */
  X_ADCP_AUTH: "x-adcp-auth",
  /** Standard HTTP auth (Bearer token) */
  AUTHORIZATION: "authorization",
  /** Tenant hint (e.g. set by nginx for path-based routing) */
  X_ADCP_TENANT: "x-adcp-tenant",
  HOST: "host",
  /** Approximated.app virtual host */
  APX_INCOMING_HOST: "apx-incoming-host",
  /** Push notification webhook URL */
  X_PUSH_NOTIFICATION_URL: "x-push-notification-url",
  X_PUSH_NOTIFICATION_AUTH_SCHEME: "x-push-notification-auth-scheme",
  X_PUSH_NOTIFICATION_CREDENTIALS: "x-push-notification-credentials",
} as const;

export const DEFAULT_TENANT_ID = "default";

export const BEARER_PREFIX = "bearer ";

export const MEDIA_BUY_STATUS = {
  DRAFT: "draft",
  PENDING: "pending",
  ACTIVE: "active",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
} as const;

export const DEFAULT_CURRENCY = "USD";

export const WORKFLOW_STATUS = {
  PENDING: "pending",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  FAILED: "failed",
  REQUIRES_APPROVAL: "requires_approval",
} as const;

export const LOCALHOST_HOSTNAMES = ["localhost", "127.0.0.1", "localhost.localdomain"] as const;
export const SKIP_SUBDOMAINS = ["localhost", "adcp-sales-agent", "www", "admin"] as const;

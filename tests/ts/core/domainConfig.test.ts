/**
 * Tests for domainConfig (ported from python_src/src/core/domain_config.py behaviour).
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  getSalesAgentDomain,
  getAdminDomain,
  getSuperAdminDomain,
  getSalesAgentUrl,
  getAdminUrl,
  getA2aServerUrl,
  getMcpServerUrl,
  isSalesAgentDomain,
  isAdminDomain,
  extractSubdomainFromHost,
  getTenantUrl,
  getOauthRedirectUri,
  getSessionCookieDomain,
  getSupportEmail,
} from "../../../src/core/domainConfig.js";

const originalEnv = process.env;

beforeEach(() => {
  process.env = { ...originalEnv };
});

afterEach(() => {
  process.env = originalEnv;
});

describe("getSalesAgentDomain", () => {
  it("returns undefined when SALES_AGENT_DOMAIN is not set", () => {
    delete process.env.SALES_AGENT_DOMAIN;
    expect(getSalesAgentDomain()).toBeUndefined();
  });

  it("returns value when SALES_AGENT_DOMAIN is set", () => {
    process.env.SALES_AGENT_DOMAIN = "sales.example.com";
    expect(getSalesAgentDomain()).toBe("sales.example.com");
  });
});

describe("getAdminDomain", () => {
  it("returns ADMIN_DOMAIN when set", () => {
    process.env.ADMIN_DOMAIN = "admin.example.com";
    expect(getAdminDomain()).toBe("admin.example.com");
  });

  it("returns admin.{SALES_AGENT_DOMAIN} when only SALES_AGENT_DOMAIN is set", () => {
    delete process.env.ADMIN_DOMAIN;
    process.env.SALES_AGENT_DOMAIN = "sales.example.com";
    expect(getAdminDomain()).toBe("admin.sales.example.com");
  });

  it("returns undefined when neither is set", () => {
    delete process.env.ADMIN_DOMAIN;
    delete process.env.SALES_AGENT_DOMAIN;
    expect(getAdminDomain()).toBeUndefined();
  });
});

describe("getSuperAdminDomain", () => {
  it("returns undefined when not set", () => {
    delete process.env.SUPER_ADMIN_DOMAIN;
    expect(getSuperAdminDomain()).toBeUndefined();
  });

  it("returns value when set", () => {
    process.env.SUPER_ADMIN_DOMAIN = "example.com";
    expect(getSuperAdminDomain()).toBe("example.com");
  });
});

describe("getSalesAgentUrl", () => {
  it("returns undefined when SALES_AGENT_DOMAIN is not set", () => {
    delete process.env.SALES_AGENT_DOMAIN;
    expect(getSalesAgentUrl()).toBeUndefined();
  });

  it("returns https URL by default", () => {
    process.env.SALES_AGENT_DOMAIN = "sales.example.com";
    expect(getSalesAgentUrl()).toBe("https://sales.example.com");
  });

  it("uses given protocol", () => {
    process.env.SALES_AGENT_DOMAIN = "sales.example.com";
    expect(getSalesAgentUrl("http")).toBe("http://sales.example.com");
  });
});

describe("getAdminUrl", () => {
  it("returns undefined when admin domain not configured", () => {
    delete process.env.SALES_AGENT_DOMAIN;
    delete process.env.ADMIN_DOMAIN;
    expect(getAdminUrl()).toBeUndefined();
  });

  it("returns https URL when domain configured", () => {
    process.env.SALES_AGENT_DOMAIN = "sales.example.com";
    expect(getAdminUrl()).toBe("https://admin.sales.example.com");
  });
});

describe("getA2aServerUrl", () => {
  it("returns undefined when SALES_AGENT_DOMAIN not set", () => {
    delete process.env.SALES_AGENT_DOMAIN;
    expect(getA2aServerUrl()).toBeUndefined();
  });

  it("returns URL with /a2a suffix", () => {
    process.env.SALES_AGENT_DOMAIN = "sales.example.com";
    expect(getA2aServerUrl("https")).toBe("https://sales.example.com/a2a");
  });

  it("auto-detects http for localhost when protocol not given", () => {
    process.env.SALES_AGENT_DOMAIN = "localhost";
    expect(getA2aServerUrl(null)).toBe("http://localhost/a2a");
  });

  it("auto-detects https for production domain when protocol not given", () => {
    process.env.SALES_AGENT_DOMAIN = "sales.example.com";
    expect(getA2aServerUrl(null)).toBe("https://sales.example.com/a2a");
  });
});

describe("getMcpServerUrl", () => {
  it("returns undefined when SALES_AGENT_DOMAIN not set", () => {
    delete process.env.SALES_AGENT_DOMAIN;
    expect(getMcpServerUrl()).toBeUndefined();
  });

  it("returns URL with /mcp suffix", () => {
    process.env.SALES_AGENT_DOMAIN = "sales.example.com";
    expect(getMcpServerUrl()).toBe("https://sales.example.com/mcp");
  });
});

describe("isSalesAgentDomain", () => {
  it("returns false when SALES_AGENT_DOMAIN not set", () => {
    delete process.env.SALES_AGENT_DOMAIN;
    expect(isSalesAgentDomain("anything")).toBe(false);
  });

  it("returns true for exact match", () => {
    process.env.SALES_AGENT_DOMAIN = "sales.example.com";
    expect(isSalesAgentDomain("sales.example.com")).toBe(true);
  });

  it("returns true for subdomain", () => {
    process.env.SALES_AGENT_DOMAIN = "sales.example.com";
    expect(isSalesAgentDomain("tenant.sales.example.com")).toBe(true);
  });

  it("returns false for different host", () => {
    process.env.SALES_AGENT_DOMAIN = "sales.example.com";
    expect(isSalesAgentDomain("other.example.com")).toBe(false);
  });
});

describe("isAdminDomain", () => {
  it("returns false when admin domain not configured", () => {
    delete process.env.SALES_AGENT_DOMAIN;
    delete process.env.ADMIN_DOMAIN;
    expect(isAdminDomain("admin.sales.example.com")).toBe(false);
  });

  it("returns true for exact match", () => {
    process.env.SALES_AGENT_DOMAIN = "sales.example.com";
    expect(isAdminDomain("admin.sales.example.com")).toBe(true);
  });

  it("returns true for host with port", () => {
    process.env.SALES_AGENT_DOMAIN = "sales.example.com";
    expect(isAdminDomain("admin.sales.example.com:8000")).toBe(true);
  });
});

describe("extractSubdomainFromHost", () => {
  it("returns undefined when SALES_AGENT_DOMAIN not set", () => {
    delete process.env.SALES_AGENT_DOMAIN;
    expect(extractSubdomainFromHost("tenant.sales.example.com")).toBeUndefined();
  });

  it("returns subdomain when host is tenant.sales.example.com", () => {
    process.env.SALES_AGENT_DOMAIN = "sales.example.com";
    expect(extractSubdomainFromHost("tenant.sales.example.com")).toBe("tenant");
  });

  it("returns undefined when host is bare domain", () => {
    process.env.SALES_AGENT_DOMAIN = "sales.example.com";
    expect(extractSubdomainFromHost("sales.example.com")).toBeUndefined();
  });
});

describe("getTenantUrl", () => {
  it("returns undefined when SALES_AGENT_DOMAIN not set", () => {
    delete process.env.SALES_AGENT_DOMAIN;
    expect(getTenantUrl("acme")).toBeUndefined();
  });

  it("returns full tenant URL", () => {
    process.env.SALES_AGENT_DOMAIN = "sales.example.com";
    expect(getTenantUrl("acme")).toBe("https://acme.sales.example.com");
  });

  it("uses given protocol", () => {
    process.env.SALES_AGENT_DOMAIN = "sales.example.com";
    expect(getTenantUrl("acme", "http")).toBe("http://acme.sales.example.com");
  });
});

describe("getOauthRedirectUri", () => {
  it("returns GOOGLE_OAUTH_REDIRECT_URI when set", () => {
    process.env.GOOGLE_OAUTH_REDIRECT_URI = "https://custom/callback";
    expect(getOauthRedirectUri()).toBe("https://custom/callback");
  });

  it("returns URL with /admin/auth/google/callback when SALES_AGENT_DOMAIN set", () => {
    delete process.env.GOOGLE_OAUTH_REDIRECT_URI;
    process.env.SALES_AGENT_DOMAIN = "sales.example.com";
    expect(getOauthRedirectUri()).toBe("https://sales.example.com/admin/auth/google/callback");
  });

  it("returns undefined when neither set", () => {
    delete process.env.GOOGLE_OAUTH_REDIRECT_URI;
    delete process.env.SALES_AGENT_DOMAIN;
    expect(getOauthRedirectUri()).toBeUndefined();
  });
});

describe("getSessionCookieDomain", () => {
  it("returns undefined when SALES_AGENT_DOMAIN not set", () => {
    delete process.env.SALES_AGENT_DOMAIN;
    expect(getSessionCookieDomain()).toBeUndefined();
  });

  it("returns leading dot for subdomain sharing", () => {
    process.env.SALES_AGENT_DOMAIN = "sales.example.com";
    expect(getSessionCookieDomain()).toBe(".sales.example.com");
  });
});

describe("getSupportEmail", () => {
  it("returns default when SUPPORT_EMAIL not set", () => {
    delete process.env.SUPPORT_EMAIL;
    expect(getSupportEmail()).toBe("support@example.com");
  });

  it("returns SUPPORT_EMAIL when set", () => {
    process.env.SUPPORT_EMAIL = "help@mycompany.com";
    expect(getSupportEmail()).toBe("help@mycompany.com");
  });
});

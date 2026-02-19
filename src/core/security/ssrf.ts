/**
 * SSRF protection: validate webhook URLs to block private/internal IPs.
 */

import { URL } from "node:url";

const BLOCKED_HOSTS = new Set([
  "localhost", "127.0.0.1", "::1", "0.0.0.0",
  "metadata.google.internal", "169.254.169.254",
]);

const BLOCKED_PREFIXES = [
  "10.", "172.16.", "172.17.", "172.18.", "172.19.",
  "172.20.", "172.21.", "172.22.", "172.23.", "172.24.",
  "172.25.", "172.26.", "172.27.", "172.28.", "172.29.",
  "172.30.", "172.31.", "192.168.", "fc00:", "fd00:",
];

export function isUrlSafe(urlString: string): boolean {
  try {
    const parsed = new URL(urlString);
    if (!["http:", "https:"].includes(parsed.protocol)) return false;
    const host = parsed.hostname.toLowerCase();
    if (BLOCKED_HOSTS.has(host)) return false;
    if (BLOCKED_PREFIXES.some((p) => host.startsWith(p))) return false;
    if (host.endsWith(".internal") || host.endsWith(".local")) return false;
    return true;
  } catch {
    return false;
  }
}

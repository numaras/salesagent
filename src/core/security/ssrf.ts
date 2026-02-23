/**
 * SSRF protection: validate webhook URLs to block private/internal IPs.
 */

import dns from "node:dns/promises";
import net from "node:net";
import { URL } from "node:url";

const BLOCKED_HOSTS = new Set([
  "localhost", "127.0.0.1", "::1", "0.0.0.0",
  "metadata.google.internal", "169.254.169.254",
]);

const BLOCKED_PREFIXES = [
  "10.", "172.16.", "172.17.", "172.18.", "172.19.",
  "172.20.", "172.21.", "172.22.", "172.23.", "172.24.",
  "172.25.", "172.26.", "172.27.", "172.28.", "172.29.",
  "172.30.", "172.31.", "192.168.", "fc00:", "fd00:", "fe80:",
];

function ipv4ToInt(ip: string): number {
  const parts = ip.split(".").map((p) => Number(p));
  return ((parts[0] ?? 0) << 24) + ((parts[1] ?? 0) << 16) + ((parts[2] ?? 0) << 8) + (parts[3] ?? 0);
}

function isPrivateIpv4(ip: string): boolean {
  const n = ipv4ToInt(ip) >>> 0;

  const isInRange = (start: string, end: string): boolean => {
    const s = ipv4ToInt(start) >>> 0;
    const e = ipv4ToInt(end) >>> 0;
    return n >= s && n <= e;
  };

  return (
    isInRange("10.0.0.0", "10.255.255.255") ||
    isInRange("172.16.0.0", "172.31.255.255") ||
    isInRange("192.168.0.0", "192.168.255.255") ||
    isInRange("127.0.0.0", "127.255.255.255") ||
    isInRange("169.254.0.0", "169.254.255.255") ||
    isInRange("0.0.0.0", "0.255.255.255")
  );
}

function isPrivateIpv6(ip: string): boolean {
  const normalized = ip.toLowerCase().split("%")[0] ?? ip.toLowerCase();
  if (normalized === "::1" || normalized === "::") return true;
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
  if (normalized.startsWith("fe80:")) return true;

  const mapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped?.[1]) {
    return isPrivateIpv4(mapped[1]);
  }
  return false;
}

function isIpBlocked(host: string): boolean {
  const ipVersion = net.isIP(host);
  if (ipVersion === 4) return isPrivateIpv4(host);
  if (ipVersion === 6) return isPrivateIpv6(host);
  return false;
}

function hasBlockedHostPattern(host: string): boolean {
  const lowered = host.toLowerCase();
  if (BLOCKED_HOSTS.has(lowered)) return true;
  if (BLOCKED_PREFIXES.some((p) => lowered.startsWith(p))) return true;
  if (lowered.endsWith(".internal") || lowered.endsWith(".local")) return true;
  if (isIpBlocked(lowered)) return true;
  return false;
}

function parseSafeCandidate(urlString: string): URL | null {
  try {
    const parsed = new URL(urlString);
    if (!["http:", "https:"].includes(parsed.protocol)) return null;
    if (!parsed.hostname) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function isUrlSafe(urlString: string): boolean {
  const parsed = parseSafeCandidate(urlString);
  if (!parsed) return false;
  return !hasBlockedHostPattern(parsed.hostname);
}

export async function isUrlSafeWithDns(urlString: string): Promise<boolean> {
  const parsed = parseSafeCandidate(urlString);
  if (!parsed) return false;

  const host = parsed.hostname.toLowerCase();
  if (hasBlockedHostPattern(host)) return false;

  // Resolve DNS and reject any private/link-local targets to avoid DNS rebinding bypass.
  try {
    const addresses = await dns.lookup(host, { all: true, verbatim: true });
    if (!addresses.length) return false;
    return addresses.every((entry) => !isIpBlocked(entry.address));
  } catch {
    return false;
  }
}

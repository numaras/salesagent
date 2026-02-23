import net from "node:net";

function normalizeIp(ip: string): string {
  const trimmed = ip.trim();
  if (trimmed.startsWith("::ffff:")) return trimmed.slice(7);
  return trimmed;
}

function ipv4ToInt(ip: string): number {
  const parts = ip.split(".").map((p) => Number.parseInt(p, 10));
  return (((parts[0] ?? 0) << 24) | ((parts[1] ?? 0) << 16) | ((parts[2] ?? 0) << 8) | (parts[3] ?? 0)) >>> 0;
}

function matchesIpv4Cidr(ip: string, cidr: string): boolean {
  const [base, prefixRaw] = cidr.split("/");
  if (!base || !prefixRaw) return false;
  const prefix = Number.parseInt(prefixRaw, 10);
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) return false;
  if (net.isIP(base) !== 4 || net.isIP(ip) !== 4) return false;

  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return (ipv4ToInt(ip) & mask) === (ipv4ToInt(base) & mask);
}

function parseAllowlist(): string[] {
  const raw = process.env.ADMIN_ALLOWED_IPS;
  if (!raw) return [];
  return raw.split(",").map((v) => v.trim()).filter(Boolean);
}

export function isAdminIpAllowed(ipInput: string): boolean {
  const allowlist = parseAllowlist();
  if (!allowlist.length) return true;
  const ip = normalizeIp(ipInput);

  for (const entry of allowlist) {
    if (entry.includes("/")) {
      if (matchesIpv4Cidr(ip, entry)) return true;
      continue;
    }
    if (normalizeIp(entry) === ip) return true;
  }

  return false;
}


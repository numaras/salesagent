/**
 * HTTP header utilities used by MCP, A2A, Admin, and auth.
 * Case-insensitive per RFC 7230.
 */

import type { IncomingMessage } from "node:http";
import type { Request } from "express";

export type HeadersLike = Record<string, string | string[] | undefined>;

export function getHeaderCaseInsensitive(
  headers: HeadersLike | null | undefined,
  headerName: string
): string | undefined {
  if (!headers || typeof headers !== "object") return undefined;
  const nameLower = headerName.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === nameLower) {
      if (Array.isArray(value)) return value[0];
      return value as string;
    }
  }
  return undefined;
}

/** Flatten Node IncomingMessage headers to Record<string, string>. */
export function headersFromNodeRequest(req: IncomingMessage | Request): Record<string, string> {
  const out: Record<string, string> = {};
  const h = req.headers;
  if (!h) return out;
  for (const [k, v] of Object.entries(h)) {
    if (typeof v === "string") out[k] = v;
    else if (Array.isArray(v) && v[0]) out[k] = v[0];
  }
  return out;
}

/** Read raw body from IncomingMessage as parsed JSON (or undefined). */
export function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw.trim()) { resolve(undefined); return; }
      try { resolve(JSON.parse(raw)); } catch { resolve(undefined); }
    });
    req.on("error", reject);
  });
}

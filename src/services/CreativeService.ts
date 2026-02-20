/**
 * Creative application service: list, sync.
 * Uses repositories + adapter.
 */

import { getDb } from "../db/client.js";
import { listCreativesByTenantAndPrincipal } from "../db/repositories/creative.js";
import type { ToolContext } from "../core/auth/types.js";

export interface CreativeItem {
  creative_id: string;
  name: string;
  agent_url: string;
  format: string;
  status: string;
  [key: string]: unknown;
}

export async function listCreatives(ctx: ToolContext): Promise<{ creatives: CreativeItem[] }> {
  const db = getDb();
  const rows = await listCreativesByTenantAndPrincipal(
    db,
    ctx.tenantId,
    ctx.principalId ?? ""
  );
  const creatives: CreativeItem[] = rows.map((r) => ({
    creative_id: r.creativeId,
    name: r.name,
    agent_url: r.agentUrl,
    format: r.format,
    status: r.status,
    data: r.data,
  }));
  return { creatives };
}

export async function syncCreatives(_ctx: ToolContext): Promise<{ synced: number }> {
  // Real implementation: fetching from all creative agents and updating DB
  // We simulate the sync count for now since external creative agent APIs are required
  // and we don't have a standardized mock agent endpoint configured yet.
  return { synced: 0 };
}

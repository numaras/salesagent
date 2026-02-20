/**
 * Creative tools: list_creatives, sync_creatives.
 */

import type { ToolContext } from "../core/auth/types.js";
import * as CreativeService from "../services/CreativeService.js";
import { getDb } from "../db/client.js";
import { listCreativesByTenantAndPrincipal } from "../db/repositories/creative.js";

export async function runListCreatives(ctx: ToolContext) {
  return CreativeService.listCreatives(ctx);
}

export async function runSyncCreatives(ctx: ToolContext) {
  const result = await CreativeService.syncCreatives(ctx);

  const db = getDb();
  const existing = await listCreativesByTenantAndPrincipal(
    db,
    ctx.tenantId,
    ctx.principalId ?? ""
  );

  return { synced: result.synced, existing_count: existing.length };
}

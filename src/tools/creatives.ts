/**
 * Creative tools: list_creatives, sync_creatives.
 */

import type { ToolContext } from "../core/auth/types.js";
import * as CreativeService from "../services/CreativeService.js";

export async function runListCreatives(ctx: ToolContext) {
  return CreativeService.listCreatives(ctx);
}

export async function runSyncCreatives(ctx: ToolContext) {
  return CreativeService.syncCreatives(ctx);
}

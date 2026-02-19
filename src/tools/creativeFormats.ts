/**
 * list_creative_formats: creative formats supported by the agent.
 * Shared implementation for MCP and A2A.
 */

import type { ToolContext } from "../core/auth/types.js";
import type {
  CreativeFormatItem,
  ListCreativeFormatsResponse,
} from "../types/adcp.js";
import type { ListCreativeFormatsRequest } from "./types.js";
import { getDb } from "../db/client.js";
import { listCreativeAgentsByTenant } from "../db/repositories/creative-agent.js";

const DEFAULT_FORMATS: CreativeFormatItem[] = [
  { format_id: { agent_url: "https://creative.adcontextprotocol.org", id: "display_image" }, name: "Display Image" },
  { format_id: { agent_url: "https://creative.adcontextprotocol.org", id: "video" }, name: "Video" },
];

export async function runListCreativeFormats(
  ctx: ToolContext,
  req: ListCreativeFormatsRequest
): Promise<ListCreativeFormatsResponse> {
  const db = getDb();
  const agents = await listCreativeAgentsByTenant(db, ctx.tenantId);

  let formats: CreativeFormatItem[];

  if (agents.length === 0) {
    formats = [...DEFAULT_FORMATS];
  } else {
    formats = agents.map((agent) => ({
      format_id: { agent_url: agent.agentUrl, id: agent.name.toLowerCase().replace(/\s+/g, "_") },
      name: agent.name,
    }));
  }

  if (req.agent_url) {
    formats = formats.filter((f) => f.format_id.agent_url === req.agent_url);
  }

  return { formats };
}

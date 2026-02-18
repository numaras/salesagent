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

const DEFAULT_FORMATS: CreativeFormatItem[] = [
  { format_id: { agent_url: "https://creative.adcontextprotocol.org", id: "display_image" }, name: "Display Image" },
  { format_id: { agent_url: "https://creative.adcontextprotocol.org", id: "video" }, name: "Video" },
];

export async function runListCreativeFormats(
  _ctx: ToolContext,
  req: ListCreativeFormatsRequest
): Promise<ListCreativeFormatsResponse> {
  const agentUrl = req.agent_url;
  const formats = agentUrl
    ? DEFAULT_FORMATS.filter((f) => f.format_id.agent_url === agentUrl)
    : [...DEFAULT_FORMATS];
  return { formats };
}

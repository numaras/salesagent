/**
 * Creative format resolution (core/shared).
 * Adapters must not depend on Admin; format resolution lives here or in a shared service.
 * Used by list_creative_formats and adapters that need format metadata.
 */

import type { FormatId } from "../types/adcp.js";

export interface CreativeFormat {
  format_id: FormatId;
  name?: string;
  width?: number;
  height?: number;
  duration_ms?: number;
}

/**
 * Resolver interface: implementations can be agent-based or static.
 * Default implementation can be provided in tools; adapters receive formats via tool context.
 */
export interface CreativeFormatResolver {
  listFormats(agentUrl?: string): Promise<CreativeFormat[]>;
}

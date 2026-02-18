/**
 * Tool context and request types shared by MCP and A2A.
 */

import type { ToolContext } from "../core/auth/types.js";

export type { ToolContext };

export interface GetProductsRequest {
  brief?: string;
  product_ids?: string[];
  [key: string]: unknown;
}

export interface ListAuthorizedPropertiesRequest {
  property_tags?: string[];
  [key: string]: unknown;
}

export interface ListCreativeFormatsRequest {
  agent_url?: string;
  [key: string]: unknown;
}

/**
 * MCP server: Streamable HTTP transport with all AdCP tools.
 * Auth resolution extracted into createToolHandler to eliminate duplication.
 */

import type { IncomingMessage, ServerResponse } from "node:http";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { resolveFromHeaders, toToolContext } from "../core/auth/authService.js";
import type { ToolContext } from "../core/auth/types.js";
import { TenantError, toMcpErrorResponse } from "../core/errors.js";
import { readBody } from "../core/httpHeaders.js";
import { extractTestContext, applyTestingHooks } from "../core/testingHooks.js";
import * as tools from "../tools/index.js";

type ToolFn<A> = (ctx: ToolContext, args: A) => Promise<unknown>;

function createToolHandler<A>(toolName: string, fn: ToolFn<A>) {
  return async (args: A, extra: unknown) => {
    try {
      const headers = (extra as { requestInfo?: { headers?: Record<string, string> } })?.requestInfo?.headers ?? {};
      const result = await resolveFromHeaders(headers);
      const ctx = toToolContext(result);
      if (!ctx?.tenantId) throw new TenantError();
      // Require a real principal token — tenant-only (anonymous) access not allowed
      if (!ctx.principalId) {
        throw new TenantError("Authentication required. Provide a valid x-adcp-auth token.");
      }
      
      const testContext = extractTestContext(headers);
      if (testContext) ctx.testContext = testContext;
      
      const data = await fn(ctx, args);
      const finalData = applyTestingHooks(data, testContext, toolName);
      
      return { content: [{ type: "text" as const, text: JSON.stringify(finalData) }] };
    } catch (err) {
      return toMcpErrorResponse(err);
    }
  };
}

export function createMcpServer(): {
  handleRequest: (req: IncomingMessage, res: ServerResponse, parsedBody?: unknown) => Promise<void>;
} {
  const mcpServer = new McpServer(
    { name: "AdCPSalesAgent", version: "0.1.0" },
    { capabilities: {} }
  );

  mcpServer.registerTool("get_adcp_capabilities", {
    description: "Returns the capabilities of this sales agent (protocols, targeting, channels).",
    inputSchema: z.object({}).strict().optional(),
  }, createToolHandler("get_adcp_capabilities", async (ctx) => tools.runGetAdcpCapabilities(ctx)));

  mcpServer.registerTool("get_products", {
    description: "Product discovery by brief or product_ids.",
    inputSchema: z.object({ brief: z.string().optional(), product_ids: z.array(z.string()).optional() }),
  }, createToolHandler("get_products", async (ctx, args) => tools.runGetProducts(ctx, { brief: args?.brief, product_ids: args?.product_ids })));

  mcpServer.registerTool("list_authorized_properties", {
    description: "List properties this agent is authorized to represent.",
    inputSchema: z.object({ property_tags: z.array(z.string()).optional() }).optional(),
  }, createToolHandler("list_authorized_properties", async (ctx) => tools.runListAuthorizedProperties(ctx)));

  mcpServer.registerTool("list_creative_formats", {
    description: "List creative formats supported by the agent.",
    inputSchema: z.object({ agent_url: z.string().optional() }).optional(),
  }, createToolHandler("list_creative_formats", async (ctx, args) => tools.runListCreativeFormats(ctx, { agent_url: args?.agent_url })));

  mcpServer.registerTool("create_media_buy", {
    description: "Create a media buy (order) with packages.",
    inputSchema: z.object({
      product_ids: z.array(z.string()),
      packages: z.array(z.record(z.string(), z.unknown())).optional(),
      budget: z.union([z.number(), z.record(z.string(), z.unknown())]).optional(),
      start_date: z.string().optional(),
      end_date: z.string().optional(),
      buyer_ref: z.string().optional(),
      order_name: z.string().optional(),
      advertiser_name: z.string().optional(),
    }),
  }, createToolHandler("create_media_buy", async (ctx, args) => tools.runCreateMediaBuy(ctx, args as Parameters<typeof tools.runCreateMediaBuy>[1])));

  mcpServer.registerTool("get_media_buy_delivery", {
    description: "Get delivery metrics for a media buy.",
    inputSchema: z.object({ media_buy_id: z.string(), start_date: z.string(), end_date: z.string() }),
  }, createToolHandler("get_media_buy_delivery", async (ctx, args) => tools.runGetMediaBuyDelivery(ctx, args!.media_buy_id, { start_date: args!.start_date, end_date: args!.end_date })));

  mcpServer.registerTool("update_media_buy", {
    description: "Update a media buy (buyer_ref, action, package budget).",
    inputSchema: z.object({
      media_buy_id: z.string(), buyer_ref: z.string(), action: z.string(),
      package_id: z.string().nullable().optional(), budget: z.number().nullable().optional(),
    }),
  }, createToolHandler("update_media_buy", async (ctx, args) => tools.runUpdateMediaBuy(ctx, args!.media_buy_id, args!.buyer_ref, args!.action, args!.package_id ?? null, args!.budget ?? null)));

  mcpServer.registerTool("update_performance_index", {
    description: "Update performance index for packages.",
    inputSchema: z.object({
      media_buy_id: z.string(),
      package_performance: z.array(z.object({ package_id: z.string(), performance_index: z.number() })),
    }),
  }, createToolHandler("update_performance_index", async (ctx, args) => ({ success: await tools.runUpdatePerformanceIndex(ctx, args!.media_buy_id, args!.package_performance) })));

  mcpServer.registerTool("list_creatives", {
    description: "List creatives for the principal.",
    inputSchema: z.object({}).optional(),
  }, createToolHandler("list_creatives", async (ctx) => tools.runListCreatives(ctx)));

  mcpServer.registerTool("sync_creatives", {
    description: "Sync creatives from adapter.",
    inputSchema: z.object({}).optional(),
  }, createToolHandler("sync_creatives", async (ctx) => tools.runSyncCreatives(ctx)));

  mcpServer.registerTool("list_tasks", {
    description: "List workflow tasks (optionally by status).",
    inputSchema: z.object({ status: z.string().optional() }).optional(),
  }, createToolHandler("list_tasks", async (ctx, args) => tools.runListTasks(ctx, args?.status)));

  mcpServer.registerTool("get_task", {
    description: "Get a single task by id.",
    inputSchema: z.object({ task_id: z.string() }),
  }, createToolHandler("get_task", async (ctx, args) => (await tools.runGetTask(ctx, args!.task_id)) ?? {}));

  mcpServer.registerTool("complete_task", {
    description: "Complete a task with optional result.",
    inputSchema: z.object({ task_id: z.string(), result: z.unknown().optional() }),
  }, createToolHandler("complete_task", async (ctx, args) => tools.runCompleteTask(ctx, args!.task_id, args?.result)));

  mcpServer.registerTool("get_signals", {
    description: "Get available signals from integrated agents.",
    inputSchema: z.object({ brief: z.string().optional() }).optional(),
  }, createToolHandler("get_signals", async (ctx, args) => tools.runGetSignals(ctx, args ?? {})));

  mcpServer.registerTool("activate_signal", {
    description: "Activate a signal.",
    inputSchema: z.object({ signal_id: z.string() }),
  }, createToolHandler("activate_signal", async (ctx, args) => tools.runActivateSignal(ctx, args!)));

  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  mcpServer.connect(transport);

  return {
    async handleRequest(req: IncomingMessage, res: ServerResponse, parsedBody?: unknown) {
      const body = parsedBody ?? (await readBody(req));
      await transport.handleRequest(req, res, body);
    },
  };
}

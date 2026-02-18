/**
 * MCP server: Streamable HTTP transport + read-only tools.
 * Auth is resolved from request headers in each tool handler via extra.requestInfo.headers.
 */

import type { IncomingMessage, ServerResponse } from "node:http";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { resolveFromHeaders, toToolContext } from "../core/auth/authService.js";
import {
  runGetAdcpCapabilities,
  runGetProducts,
  runListAuthorizedProperties,
  runListCreativeFormats,
  runCreateMediaBuy,
  runGetMediaBuyDelivery,
  runUpdateMediaBuy,
  runUpdatePerformanceIndex,
  runListCreatives,
  runSyncCreatives,
  runListTasks,
  runGetTask,
  runCompleteTask,
} from "../tools/index.js";

function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw.trim()) {
        resolve(undefined);
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve(undefined);
      }
    });
    req.on("error", reject);
  });
}

export function createMcpServer(): {
  handleRequest: (req: IncomingMessage, res: ServerResponse, parsedBody?: unknown) => Promise<void>;
} {
  const mcpServer = new McpServer(
    { name: "AdCPSalesAgent", version: "0.1.0" },
    { capabilities: {} }
  );

  const toolExtra = (extra: { requestInfo?: { headers?: Record<string, string> } }) => {
    const headers = extra?.requestInfo?.headers ?? {};
    return { headers };
  };

  mcpServer.registerTool(
    "get_adcp_capabilities",
    {
      description: "Returns the capabilities of this sales agent (protocols, targeting, channels).",
      inputSchema: z.object({}).strict().optional(),
    },
    async (_args, extra) => {
      const { headers } = toolExtra(extra as { requestInfo?: { headers?: Record<string, string> } });
      const result = await resolveFromHeaders(headers);
      const ctx = toToolContext(result);
      if (!ctx?.tenantId) {
        return { content: [{ type: "text", text: JSON.stringify({ error: "TENANT_ERROR", message: "Could not resolve tenant" }) }], isError: true };
      }
      const data = await runGetAdcpCapabilities(ctx);
      return { content: [{ type: "text", text: JSON.stringify(data) }] };
    }
  );

  mcpServer.registerTool(
    "get_products",
    {
      description: "Product discovery by brief or product_ids.",
      inputSchema: z.object({
        brief: z.string().optional(),
        product_ids: z.array(z.string()).optional(),
      }),
    },
    async (args, extra) => {
      const { headers } = toolExtra(extra as { requestInfo?: { headers?: Record<string, string> } });
      const result = await resolveFromHeaders(headers);
      const ctx = toToolContext(result);
      if (!ctx?.tenantId) {
        return { content: [{ type: "text", text: JSON.stringify({ error: "TENANT_ERROR", message: "Could not resolve tenant" }) }], isError: true };
      }
      const data = await runGetProducts(ctx, { brief: args?.brief, product_ids: args?.product_ids });
      return { content: [{ type: "text", text: JSON.stringify(data) }] };
    }
  );

  mcpServer.registerTool(
    "list_authorized_properties",
    {
      description: "List properties this agent is authorized to represent.",
      inputSchema: z.object({ property_tags: z.array(z.string()).optional() }).optional(),
    },
    async (_args, extra) => {
      const { headers } = toolExtra(extra as { requestInfo?: { headers?: Record<string, string> } });
      const result = await resolveFromHeaders(headers);
      const ctx = toToolContext(result);
      if (!ctx?.tenantId) {
        return { content: [{ type: "text", text: JSON.stringify({ error: "TENANT_ERROR", message: "Could not resolve tenant" }) }], isError: true };
      }
      const data = await runListAuthorizedProperties(ctx);
      return { content: [{ type: "text", text: JSON.stringify(data) }] };
    }
  );

  mcpServer.registerTool(
    "list_creative_formats",
    {
      description: "List creative formats supported by the agent.",
      inputSchema: z.object({ agent_url: z.string().optional() }).optional(),
    },
    async (args, extra) => {
      const { headers } = toolExtra(extra as { requestInfo?: { headers?: Record<string, string> } });
      const result = await resolveFromHeaders(headers);
      const ctx = toToolContext(result);
      if (!ctx?.tenantId) {
        return { content: [{ type: "text", text: JSON.stringify({ error: "TENANT_ERROR", message: "Could not resolve tenant" }) }], isError: true };
      }
      const data = await runListCreativeFormats(ctx, { agent_url: args?.agent_url });
      return { content: [{ type: "text", text: JSON.stringify(data) }] };
    }
  );

  mcpServer.registerTool(
    "create_media_buy",
    {
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
    },
    async (args, extra) => {
      const { headers } = toolExtra(extra as { requestInfo?: { headers?: Record<string, string> } });
      const result = await resolveFromHeaders(headers);
      const ctx = toToolContext(result);
      if (!ctx?.tenantId) {
        return { content: [{ type: "text", text: JSON.stringify({ error: "TENANT_ERROR", message: "Could not resolve tenant" }) }], isError: true };
      }
      const data = await runCreateMediaBuy(ctx, args as Parameters<typeof runCreateMediaBuy>[1]);
      return { content: [{ type: "text", text: JSON.stringify(data) }] };
    }
  );

  mcpServer.registerTool(
    "get_media_buy_delivery",
    {
      description: "Get delivery metrics for a media buy.",
      inputSchema: z.object({
        media_buy_id: z.string(),
        start_date: z.string(),
        end_date: z.string(),
      }),
    },
    async (args, extra) => {
      const { headers } = toolExtra(extra as { requestInfo?: { headers?: Record<string, string> } });
      const result = await resolveFromHeaders(headers);
      const ctx = toToolContext(result);
      if (!ctx?.tenantId) {
        return { content: [{ type: "text", text: JSON.stringify({ error: "TENANT_ERROR", message: "Could not resolve tenant" }) }], isError: true };
      }
      const data = await runGetMediaBuyDelivery(ctx, args!.media_buy_id, {
        start_date: args!.start_date,
        end_date: args!.end_date,
      });
      return { content: [{ type: "text", text: JSON.stringify(data) }] };
    }
  );

  mcpServer.registerTool(
    "update_media_buy",
    {
      description: "Update a media buy (buyer_ref, action, package budget).",
      inputSchema: z.object({
        media_buy_id: z.string(),
        buyer_ref: z.string(),
        action: z.string(),
        package_id: z.string().nullable().optional(),
        budget: z.number().nullable().optional(),
      }),
    },
    async (args, extra) => {
      const { headers } = toolExtra(extra as { requestInfo?: { headers?: Record<string, string> } });
      const result = await resolveFromHeaders(headers);
      const ctx = toToolContext(result);
      if (!ctx?.tenantId) {
        return { content: [{ type: "text", text: JSON.stringify({ error: "TENANT_ERROR", message: "Could not resolve tenant" }) }], isError: true };
      }
      const data = await runUpdateMediaBuy(
        ctx,
        args!.media_buy_id,
        args!.buyer_ref,
        args!.action,
        args!.package_id ?? null,
        args!.budget ?? null
      );
      return { content: [{ type: "text", text: JSON.stringify(data) }] };
    }
  );

  mcpServer.registerTool(
    "update_performance_index",
    {
      description: "Update performance index for packages.",
      inputSchema: z.object({
        media_buy_id: z.string(),
        package_performance: z.array(z.object({ package_id: z.string(), performance_index: z.number() })),
      }),
    },
    async (args, extra) => {
      const { headers } = toolExtra(extra as { requestInfo?: { headers?: Record<string, string> } });
      const result = await resolveFromHeaders(headers);
      const ctx = toToolContext(result);
      if (!ctx?.tenantId) {
        return { content: [{ type: "text", text: JSON.stringify({ error: "TENANT_ERROR", message: "Could not resolve tenant" }) }], isError: true };
      }
      const data = await runUpdatePerformanceIndex(ctx, args!.media_buy_id, args!.package_performance);
      return { content: [{ type: "text", text: JSON.stringify({ success: data }) }] };
    }
  );

  mcpServer.registerTool(
    "list_creatives",
    { description: "List creatives for the principal.", inputSchema: z.object({}).optional() },
    async (_args, extra) => {
      const { headers } = toolExtra(extra as { requestInfo?: { headers?: Record<string, string> } });
      const result = await resolveFromHeaders(headers);
      const ctx = toToolContext(result);
      if (!ctx?.tenantId) {
        return { content: [{ type: "text", text: JSON.stringify({ error: "TENANT_ERROR", message: "Could not resolve tenant" }) }], isError: true };
      }
      const data = await runListCreatives(ctx);
      return { content: [{ type: "text", text: JSON.stringify(data) }] };
    }
  );

  mcpServer.registerTool(
    "sync_creatives",
    { description: "Sync creatives from adapter.", inputSchema: z.object({}).optional() },
    async (_args, extra) => {
      const { headers } = toolExtra(extra as { requestInfo?: { headers?: Record<string, string> } });
      const result = await resolveFromHeaders(headers);
      const ctx = toToolContext(result);
      if (!ctx?.tenantId) {
        return { content: [{ type: "text", text: JSON.stringify({ error: "TENANT_ERROR", message: "Could not resolve tenant" }) }], isError: true };
      }
      const data = await runSyncCreatives(ctx);
      return { content: [{ type: "text", text: JSON.stringify(data) }] };
    }
  );

  mcpServer.registerTool(
    "list_tasks",
    {
      description: "List workflow tasks (optionally by status).",
      inputSchema: z.object({ status: z.string().optional() }).optional(),
    },
    async (args, extra) => {
      const { headers } = toolExtra(extra as { requestInfo?: { headers?: Record<string, string> } });
      const result = await resolveFromHeaders(headers);
      const ctx = toToolContext(result);
      if (!ctx?.tenantId) {
        return { content: [{ type: "text", text: JSON.stringify({ error: "TENANT_ERROR", message: "Could not resolve tenant" }) }], isError: true };
      }
      const data = await runListTasks(ctx, args?.status);
      return { content: [{ type: "text", text: JSON.stringify(data) }] };
    }
  );

  mcpServer.registerTool(
    "get_task",
    { description: "Get a single task by id.", inputSchema: z.object({ task_id: z.string() }) },
    async (args, extra) => {
      const { headers } = toolExtra(extra as { requestInfo?: { headers?: Record<string, string> } });
      const result = await resolveFromHeaders(headers);
      const ctx = toToolContext(result);
      if (!ctx?.tenantId) {
        return { content: [{ type: "text", text: JSON.stringify({ error: "TENANT_ERROR", message: "Could not resolve tenant" }) }], isError: true };
      }
      const data = await runGetTask(ctx, args!.task_id);
      return { content: [{ type: "text", text: JSON.stringify(data ?? {}) }] };
    }
  );

  mcpServer.registerTool(
    "complete_task",
    {
      description: "Complete a task with optional result.",
      inputSchema: z.object({ task_id: z.string(), result: z.unknown().optional() }),
    },
    async (args, extra) => {
      const { headers } = toolExtra(extra as { requestInfo?: { headers?: Record<string, string> } });
      const result = await resolveFromHeaders(headers);
      const ctx = toToolContext(result);
      if (!ctx?.tenantId) {
        return { content: [{ type: "text", text: JSON.stringify({ error: "TENANT_ERROR", message: "Could not resolve tenant" }) }], isError: true };
      }
      const data = await runCompleteTask(ctx, args!.task_id, args?.result);
      return { content: [{ type: "text", text: JSON.stringify(data) }] };
    }
  );

  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  mcpServer.connect(transport);

  return {
    async handleRequest(req: IncomingMessage, res: ServerResponse, parsedBody?: unknown) {
      const body = parsedBody ?? (await readBody(req));
      await transport.handleRequest(req, res, body);
    },
  };
}

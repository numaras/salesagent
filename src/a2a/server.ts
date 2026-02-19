/**
 * A2A server: JSON-RPC over HTTP with dispatch table (no switch).
 * Same auth and tool implementations as MCP.
 */

import type { IncomingMessage, ServerResponse } from "node:http";
import { resolveFromHeaders, toToolContext } from "../core/auth/authService.js";
import type { ToolContext } from "../core/auth/types.js";
import { TenantError, toJsonRpcError } from "../core/errors.js";
import { headersFromNodeRequest, readBody } from "../core/httpHeaders.js";
import * as tools from "../tools/index.js";

type JsonRpcRequest = { jsonrpc: "2.0"; id?: string | number | null; method: string; params?: unknown };
type JsonRpcResponse = { jsonrpc: "2.0"; id: string | number | null; result?: unknown; error?: { code: number; message: string; data?: unknown } };

type ToolDispatchFn = (ctx: ToolContext, params: Record<string, unknown>) => Promise<unknown>;

const TOOL_DISPATCH = new Map<string, ToolDispatchFn>([
  ["get_adcp_capabilities", async (ctx) => tools.runGetAdcpCapabilities(ctx)],
  ["get_products", async (ctx, p) => tools.runGetProducts(ctx, { brief: p.brief as string | undefined, product_ids: p.product_ids as string[] | undefined })],
  ["list_authorized_properties", async (ctx) => tools.runListAuthorizedProperties(ctx)],
  ["list_creative_formats", async (ctx, p) => tools.runListCreativeFormats(ctx, { agent_url: p.agent_url as string | undefined })],
  ["create_media_buy", async (ctx, p) => tools.runCreateMediaBuy(ctx, p as Parameters<typeof tools.runCreateMediaBuy>[1])],
  ["get_media_buy_delivery", async (ctx, p) => tools.runGetMediaBuyDelivery(ctx, p.media_buy_id as string, { start_date: p.start_date as string, end_date: p.end_date as string })],
  ["update_media_buy", async (ctx, p) => tools.runUpdateMediaBuy(ctx, p.media_buy_id as string, p.buyer_ref as string, p.action as string, (p.package_id as string) ?? null, (p.budget as number) ?? null)],
  ["update_performance_index", async (ctx, p) => tools.runUpdatePerformanceIndex(ctx, p.media_buy_id as string, (p.package_performance as { package_id: string; performance_index: number }[]) ?? [])],
  ["list_creatives", async (ctx) => tools.runListCreatives(ctx)],
  ["sync_creatives", async (ctx) => tools.runSyncCreatives(ctx)],
  ["list_tasks", async (ctx, p) => tools.runListTasks(ctx, p.status as string | undefined)],
  ["get_task", async (ctx, p) => tools.runGetTask(ctx, p.task_id as string)],
  ["complete_task", async (ctx, p) => tools.runCompleteTask(ctx, p.task_id as string, p.result)],
]);

function sendJson(res: ServerResponse, status: number, data: unknown): void {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

export async function handleA2aRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method Not Allowed" });
    return;
  }

  const body = await readBody(req);
  const parsed = Array.isArray(body) ? body : body && typeof body === "object" ? [body] : [];
  const requests = parsed as JsonRpcRequest[];

  const headers = headersFromNodeRequest(req);
  const authResult = await resolveFromHeaders(headers);
  const ctx = toToolContext(authResult);

  if (!ctx?.tenantId) {
    sendJson(res, 200, {
      jsonrpc: "2.0",
      id: requests[0]?.id ?? null,
      error: toJsonRpcError(new TenantError()),
    });
    return;
  }

  const results: JsonRpcResponse[] = [];
  for (const r of requests) {
    const id = r?.id ?? null;
    if (!r?.method || r.jsonrpc !== "2.0") {
      results.push({ jsonrpc: "2.0", id, error: { code: -32600, message: "Invalid Request" } });
      continue;
    }

    const handler = TOOL_DISPATCH.get(r.method);
    if (!handler) {
      results.push({ jsonrpc: "2.0", id, error: { code: -32601, message: "Method not found: " + r.method } });
      continue;
    }

    try {
      const params = (r.params as Record<string, unknown>) ?? {};
      const result = await handler(ctx, params);
      results.push({ jsonrpc: "2.0", id, result });
    } catch (err) {
      results.push({ jsonrpc: "2.0", id, error: toJsonRpcError(err) });
    }
  }

  sendJson(res, 200, results.length === 1 ? results[0] : results);
}

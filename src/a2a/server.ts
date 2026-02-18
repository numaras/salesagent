/**
 * A2A server: JSON-RPC over HTTP; same auth and tool implementations as MCP.
 * Skill name maps to tool (e.g. get_products -> runGetProducts).
 */

import type { IncomingMessage, ServerResponse } from "node:http";
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

type JsonRpcRequest = {
  jsonrpc: "2.0";
  id?: string | number | null;
  method: string;
  params?: unknown;
};

type JsonRpcResponse = {
  jsonrpc: "2.0";
  id: string | number | null;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
};

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

function headersFromReq(req: IncomingMessage): Record<string, string> {
  const out: Record<string, string> = {};
  if (!req.headers) return out;
  for (const [k, v] of Object.entries(req.headers)) {
    if (typeof v === "string") out[k] = v;
    else if (Array.isArray(v) && v[0]) out[k] = v[0];
  }
  return out;
}

function sendJson(res: ServerResponse, status: number, data: unknown): void {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

export async function handleA2aRequest(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method Not Allowed" });
    return;
  }

  const body = await readBody(req);
  const parsed = Array.isArray(body) ? body : body && typeof body === "object" ? [body] : [];
  const requests = parsed as JsonRpcRequest[];

  const headers = headersFromReq(req);
  const authResult = await resolveFromHeaders(headers);
  const ctx = toToolContext(authResult);

  if (!ctx?.tenantId) {
    const err: JsonRpcResponse = {
      jsonrpc: "2.0",
      id: requests[0]?.id ?? null,
      error: { code: -32001, message: "TENANT_ERROR: Could not resolve tenant" },
    };
    sendJson(res, 200, err);
    return;
  }

  const results: JsonRpcResponse[] = [];
  for (const r of requests) {
    const id = r?.id ?? null;
    if (!r?.method || r.jsonrpc !== "2.0") {
      results.push({
        jsonrpc: "2.0",
        id,
        error: { code: -32600, message: "Invalid Request" },
      });
      continue;
    }

    try {
      let result: unknown;
      const params = (r.params as Record<string, unknown>) ?? {};
      switch (r.method) {
        case "get_adcp_capabilities":
          result = await runGetAdcpCapabilities(ctx);
          break;
        case "get_products":
          result = await runGetProducts(ctx, {
            brief: params.brief as string | undefined,
            product_ids: params.product_ids as string[] | undefined,
          });
          break;
        case "list_authorized_properties":
          result = await runListAuthorizedProperties(ctx);
          break;
        case "list_creative_formats":
          result = await runListCreativeFormats(ctx, {
            agent_url: params.agent_url as string | undefined,
          });
          break;
        case "create_media_buy":
          result = await runCreateMediaBuy(ctx, params as Parameters<typeof runCreateMediaBuy>[1]);
          break;
        case "get_media_buy_delivery":
          result = await runGetMediaBuyDelivery(
            ctx,
            params.media_buy_id as string,
            { start_date: params.start_date as string, end_date: params.end_date as string }
          );
          break;
        case "update_media_buy":
          result = await runUpdateMediaBuy(
            ctx,
            params.media_buy_id as string,
            params.buyer_ref as string,
            params.action as string,
            (params.package_id as string) ?? null,
            (params.budget as number) ?? null
          );
          break;
        case "update_performance_index":
          result = await runUpdatePerformanceIndex(
            ctx,
            params.media_buy_id as string,
            (params.package_performance as { package_id: string; performance_index: number }[]) ?? []
          );
          break;
        case "list_creatives":
          result = await runListCreatives(ctx);
          break;
        case "sync_creatives":
          result = await runSyncCreatives(ctx);
          break;
        case "list_tasks":
          result = await runListTasks(ctx, params.status as string | undefined);
          break;
        case "get_task":
          result = await runGetTask(ctx, params.task_id as string);
          break;
        case "complete_task":
          result = await runCompleteTask(ctx, params.task_id as string, params.result);
          break;
        default:
          results.push({
            jsonrpc: "2.0",
            id,
            error: { code: -32601, message: "Method not found: " + r.method },
          });
          continue;
      }
      results.push({ jsonrpc: "2.0", id, result });
    } catch (err) {
      results.push({
        jsonrpc: "2.0",
        id,
        error: {
          code: -32603,
          message: err instanceof Error ? err.message : "Internal error",
        },
      });
    }
  }

  sendJson(res, 200, results.length === 1 ? results[0] : results);
}

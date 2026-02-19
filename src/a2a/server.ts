/**
 * A2A server: full protocol with task lifecycle, context persistence,
 * push notifications, artifact generation, and discovery.
 *
 * JSON-RPC over HTTP; same auth and tool implementations as MCP.
 */

import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { resolveFromHeaders, toToolContext } from "../core/auth/authService.js";
import type { ToolContext } from "../core/auth/types.js";
import { TenantError, toJsonRpcError } from "../core/errors.js";
import { headersFromNodeRequest, readBody } from "../core/httpHeaders.js";
import { getDb } from "../db/client.js";
import {
  getOrCreateContext,
  appendToConversation,
} from "../core/contextManager.js";
import { sendPushNotification } from "../services/ProtocolWebhookService.js";
import * as tools from "../tools/index.js";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id?: string | number | null;
  method: string;
  params?: unknown;
}

interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: string | number | null;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

interface A2aPart {
  type: "text" | "data";
  text?: string;
  data?: unknown;
  mimeType?: string;
}

interface A2aArtifact {
  parts: A2aPart[];
}

interface A2aTask {
  id: string;
  contextId: string;
  status: "pending" | "running" | "completed" | "failed";
  artifacts: A2aArtifact[];
  error?: string;
  createdAt: string;
  completedAt?: string;
}

interface MessageSendParams {
  message: {
    parts: A2aPart[];
    contextId?: string;
    role?: string;
  };
  pushNotification?: {
    url: string;
    events?: string[];
  };
}

interface SkillDescriptor {
  id: string;
  name: string;
  description: string;
}

/* ------------------------------------------------------------------ */
/*  Tool dispatch table                                                */
/* ------------------------------------------------------------------ */

type ToolDispatchFn = (
  ctx: ToolContext,
  params: Record<string, unknown>,
) => Promise<unknown>;

const TOOL_DISPATCH = new Map<string, ToolDispatchFn>([
  ["get_adcp_capabilities", async (ctx) => tools.runGetAdcpCapabilities(ctx)],
  [
    "get_products",
    async (ctx, p) =>
      tools.runGetProducts(ctx, {
        brief: p.brief as string | undefined,
        product_ids: p.product_ids as string[] | undefined,
      }),
  ],
  [
    "list_authorized_properties",
    async (ctx) => tools.runListAuthorizedProperties(ctx),
  ],
  [
    "list_creative_formats",
    async (ctx, p) =>
      tools.runListCreativeFormats(ctx, {
        agent_url: p.agent_url as string | undefined,
      }),
  ],
  [
    "create_media_buy",
    async (ctx, p) =>
      tools.runCreateMediaBuy(
        ctx,
        p as Parameters<typeof tools.runCreateMediaBuy>[1],
      ),
  ],
  [
    "get_media_buy_delivery",
    async (ctx, p) =>
      tools.runGetMediaBuyDelivery(ctx, p.media_buy_id as string, {
        start_date: p.start_date as string,
        end_date: p.end_date as string,
      }),
  ],
  [
    "update_media_buy",
    async (ctx, p) =>
      tools.runUpdateMediaBuy(
        ctx,
        p.media_buy_id as string,
        p.buyer_ref as string,
        p.action as string,
        (p.package_id as string) ?? null,
        (p.budget as number) ?? null,
      ),
  ],
  [
    "update_performance_index",
    async (ctx, p) =>
      tools.runUpdatePerformanceIndex(
        ctx,
        p.media_buy_id as string,
        (p.package_performance as {
          package_id: string;
          performance_index: number;
        }[]) ?? [],
      ),
  ],
  ["list_creatives", async (ctx) => tools.runListCreatives(ctx)],
  ["sync_creatives", async (ctx) => tools.runSyncCreatives(ctx)],
  [
    "list_tasks",
    async (ctx, p) =>
      tools.runListTasks(ctx, p.status as string | undefined),
  ],
  [
    "get_task",
    async (ctx, p) => tools.runGetTask(ctx, p.task_id as string),
  ],
  [
    "complete_task",
    async (ctx, p) => tools.runCompleteTask(ctx, p.task_id as string, p.result),
  ],
]);

const SKILL_DESCRIPTORS: SkillDescriptor[] = [
  { id: "get_adcp_capabilities", name: "Get AdCP Capabilities", description: "Returns agent capabilities per the AdCP spec." },
  { id: "get_products", name: "Get Products", description: "Search and retrieve available advertising products." },
  { id: "list_authorized_properties", name: "List Authorized Properties", description: "List publisher properties authorized for the principal." },
  { id: "list_creative_formats", name: "List Creative Formats", description: "List creative formats supported by the ad server." },
  { id: "create_media_buy", name: "Create Media Buy", description: "Create a new media buy (order/line item)." },
  { id: "get_media_buy_delivery", name: "Get Media Buy Delivery", description: "Retrieve delivery metrics for a media buy." },
  { id: "update_media_buy", name: "Update Media Buy", description: "Update an existing media buy (approve, pause, cancel, etc.)." },
  { id: "update_performance_index", name: "Update Performance Index", description: "Update performance index values for media buy packages." },
  { id: "list_creatives", name: "List Creatives", description: "List creatives associated with the principal." },
  { id: "sync_creatives", name: "Sync Creatives", description: "Synchronize creatives from the ad server." },
  { id: "list_tasks", name: "List Tasks", description: "List human-in-the-loop tasks, optionally filtered by status." },
  { id: "get_task", name: "Get Task", description: "Retrieve a single task by ID." },
  { id: "complete_task", name: "Complete Task", description: "Complete a human-in-the-loop task with a result." },
];

/* ------------------------------------------------------------------ */
/*  In-memory task store                                               */
/* ------------------------------------------------------------------ */

const taskStore = new Map<string, A2aTask>();

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function sendJson(res: ServerResponse, status: number, data: unknown): void {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

function rpcOk(
  id: string | number | null,
  result: unknown,
): JsonRpcResponse {
  return { jsonrpc: "2.0", id, result };
}

function rpcErr(
  id: string | number | null,
  error: { code: number; message: string; data?: unknown },
): JsonRpcResponse {
  return { jsonrpc: "2.0", id, error };
}

function extractTextFromParts(parts: A2aPart[]): string {
  return parts
    .filter((p) => p.type === "text" && p.text)
    .map((p) => p.text)
    .join("\n");
}

function extractToolAndParams(
  parts: A2aPart[],
): { toolName: string; params: Record<string, unknown> } | null {
  for (const part of parts) {
    if (part.type === "data" && part.data && typeof part.data === "object") {
      const d = part.data as Record<string, unknown>;
      if (typeof d.tool === "string") {
        const { tool, ...rest } = d;
        return { toolName: tool, params: rest };
      }
    }
  }

  const text = extractTextFromParts(parts);
  if (!text) return null;

  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    if (typeof parsed.tool === "string") {
      const { tool, ...rest } = parsed;
      return { toolName: tool, params: rest };
    }
  } catch {
    /* not JSON — try to match tool name from text */
  }

  for (const name of Array.from(TOOL_DISPATCH.keys())) {
    if (text.toLowerCase().includes(name)) {
      return { toolName: name, params: {} };
    }
  }
  return null;
}

function buildArtifacts(result: unknown): A2aArtifact[] {
  const parts: A2aPart[] = [
    { type: "text", text: JSON.stringify(result) },
  ];

  if (result !== null && typeof result === "object") {
    parts.push({
      type: "data",
      data: result,
      mimeType: "application/json",
    });
  }

  return [{ parts }];
}

/* ------------------------------------------------------------------ */
/*  Method handlers                                                    */
/* ------------------------------------------------------------------ */

async function handleMessageSend(
  ctx: ToolContext,
  params: MessageSendParams,
  requestId: string | number | null,
): Promise<JsonRpcResponse> {
  const { message, pushNotification } = params;
  if (!message?.parts || !Array.isArray(message.parts)) {
    return rpcErr(requestId, {
      code: -32602,
      message: "Invalid params: message.parts is required",
    });
  }

  const db = getDb();
  const principalId = ctx.principalId ?? "anonymous";

  const { contextId } = await getOrCreateContext(
    db,
    ctx.tenantId,
    principalId,
    message.contextId,
  );

  const userContent = extractTextFromParts(message.parts);
  if (userContent) {
    await appendToConversation(
      db,
      contextId,
      message.role ?? "user",
      userContent,
    );
  }

  const task: A2aTask = {
    id: randomUUID(),
    contextId,
    status: "pending",
    artifacts: [],
    createdAt: new Date().toISOString(),
  };
  taskStore.set(task.id, task);

  const extracted = extractToolAndParams(message.parts);
  if (!extracted) {
    task.status = "failed";
    task.error = "Could not determine tool from message parts";
    task.completedAt = new Date().toISOString();
    return rpcOk(requestId, { task });
  }

  const handler = TOOL_DISPATCH.get(extracted.toolName);
  if (!handler) {
    task.status = "failed";
    task.error = `Unknown tool: ${extracted.toolName}`;
    task.completedAt = new Date().toISOString();
    return rpcOk(requestId, { task });
  }

  task.status = "running";

  try {
    const result = await handler(ctx, extracted.params);
    task.status = "completed";
    task.artifacts = buildArtifacts(result);
    task.completedAt = new Date().toISOString();

    await appendToConversation(
      db,
      contextId,
      "assistant",
      JSON.stringify(result),
    );
  } catch (err) {
    task.status = "failed";
    task.error = err instanceof Error ? err.message : "Internal error";
    task.completedAt = new Date().toISOString();

    await appendToConversation(
      db,
      contextId,
      "assistant",
      JSON.stringify({ error: task.error }),
    );
  }

  if (pushNotification?.url && ctx.principalId) {
    sendPushNotification(ctx.tenantId, ctx.principalId, "task.completed", {
      taskId: task.id,
      status: task.status,
      webhookUrl: pushNotification.url,
    }).catch(() => {
      /* best-effort delivery */
    });
  }

  return rpcOk(requestId, { task });
}

function handleTasksGet(
  requestId: string | number | null,
  params: Record<string, unknown>,
): JsonRpcResponse {
  const taskId = params.id as string | undefined;
  if (!taskId) {
    return rpcErr(requestId, {
      code: -32602,
      message: "Invalid params: id is required",
    });
  }

  const task = taskStore.get(taskId);
  if (!task) {
    return rpcErr(requestId, {
      code: -32004,
      message: `Task not found: ${taskId}`,
    });
  }

  return rpcOk(requestId, { task });
}

function handleSkillsList(
  requestId: string | number | null,
): JsonRpcResponse {
  return rpcOk(requestId, { skills: SKILL_DESCRIPTORS });
}

async function handleLegacyToolCall(
  ctx: ToolContext,
  method: string,
  params: Record<string, unknown>,
  requestId: string | number | null,
): Promise<JsonRpcResponse> {
  const handler = TOOL_DISPATCH.get(method);
  if (!handler) {
    return rpcErr(requestId, {
      code: -32601,
      message: `Method not found: ${method}`,
    });
  }

  try {
    const result = await handler(ctx, params);
    return rpcOk(requestId, result);
  } catch (err) {
    return rpcErr(requestId, toJsonRpcError(err));
  }
}

/* ------------------------------------------------------------------ */
/*  Request router                                                     */
/* ------------------------------------------------------------------ */

const UNAUTHENTICATED_METHODS = new Set(["skills/list"]);

async function dispatchSingle(
  r: JsonRpcRequest,
  ctx: ToolContext | null,
): Promise<JsonRpcResponse> {
  const id = r?.id ?? null;

  if (!r?.method || r.jsonrpc !== "2.0") {
    return rpcErr(id, { code: -32600, message: "Invalid Request" });
  }

  if (UNAUTHENTICATED_METHODS.has(r.method)) {
    return handleSkillsList(id);
  }

  if (!ctx?.tenantId) {
    return rpcErr(id, toJsonRpcError(new TenantError()));
  }

  const params = (r.params ?? {}) as Record<string, unknown>;

  switch (r.method) {
    case "message/send":
      return handleMessageSend(ctx, params as unknown as MessageSendParams, id);

    case "tasks/get":
      return handleTasksGet(id, params);

    default:
      return handleLegacyToolCall(ctx, r.method, params, id);
  }
}

/* ------------------------------------------------------------------ */
/*  Public handler                                                     */
/* ------------------------------------------------------------------ */

export async function handleA2aRequest(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method Not Allowed" });
    return;
  }

  const body = await readBody(req);
  const parsed = Array.isArray(body)
    ? body
    : body && typeof body === "object"
      ? [body]
      : [];
  const requests = parsed as JsonRpcRequest[];

  if (requests.length === 0) {
    sendJson(res, 200, rpcErr(null, { code: -32700, message: "Parse error" }));
    return;
  }

  const headers = headersFromNodeRequest(req);
  const authResult = await resolveFromHeaders(headers);
  const ctx = toToolContext(authResult);

  const results: JsonRpcResponse[] = [];
  for (const r of requests) {
    results.push(await dispatchSingle(r, ctx));
  }

  sendJson(res, 200, results.length === 1 ? results[0] : results);
}

/**
 * Prometheus metrics: HTTP requests, tool calls, webhooks, AI reviews.
 */

import { Registry, Counter, Histogram, collectDefaultMetrics } from "prom-client";

export const registry = new Registry();
collectDefaultMetrics({ register: registry });

export const httpRequestDuration = new Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "path", "status"] as const,
  registers: [registry],
});

export const toolCallCounter = new Counter({
  name: "tool_calls_total",
  help: "Total MCP/A2A tool calls",
  labelNames: ["tool", "status"] as const,
  registers: [registry],
});

export const toolCallDuration = new Histogram({
  name: "tool_call_duration_seconds",
  help: "Tool call duration in seconds",
  labelNames: ["tool"] as const,
  registers: [registry],
});

export const webhookDeliveryCounter = new Counter({
  name: "webhook_deliveries_total",
  help: "Total webhook delivery attempts",
  labelNames: ["status"] as const,
  registers: [registry],
});

export const aiReviewCounter = new Counter({
  name: "ai_reviews_total",
  help: "Total AI creative reviews",
  labelNames: ["decision"] as const,
  registers: [registry],
});

export const aiReviewDuration = new Histogram({
  name: "ai_review_duration_seconds",
  help: "AI review duration in seconds",
  registers: [registry],
});

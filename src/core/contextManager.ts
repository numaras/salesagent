/**
 * A2A context persistence and conversation tracking.
 * Ported from python_src context management logic.
 */

import { randomUUID } from "node:crypto";
import type { DrizzleDb } from "../db/client.js";
import {
  getContextById,
  insertContext,
  updateContextConversation,
} from "../db/repositories/context.js";

export interface ConversationEntry {
  role: string;
  content: string;
  timestamp: string;
}

/**
 * Find an existing context or create a new one.
 * If contextId is provided, looks it up; otherwise creates a new context with a UUID.
 */
export async function getOrCreateContext(
  db: DrizzleDb,
  tenantId: string,
  principalId: string,
  contextId?: string
): Promise<{ contextId: string; created: boolean }> {
  if (contextId) {
    const existing = await getContextById(db, contextId);
    if (existing) {
      return { contextId: existing.contextId, created: false };
    }
  }

  const newId = contextId ?? randomUUID();
  await insertContext(db, {
    contextId: newId,
    tenantId,
    principalId,
    conversationHistory: [],
  });

  return { contextId: newId, created: true };
}

/**
 * Append a message to the context's conversation history.
 */
export async function appendToConversation(
  db: DrizzleDb,
  contextId: string,
  role: string,
  content: string
): Promise<void> {
  const ctx = await getContextById(db, contextId);
  if (!ctx) {
    throw new Error(`Context not found: ${contextId}`);
  }

  const history = Array.isArray(ctx.conversationHistory)
    ? (ctx.conversationHistory as ConversationEntry[])
    : [];

  const entry: ConversationEntry = {
    role,
    content,
    timestamp: new Date().toISOString(),
  };

  history.push(entry);
  await updateContextConversation(db, contextId, history);
}

/**
 * Return the conversation history for a context.
 */
export async function getConversationHistory(
  db: DrizzleDb,
  contextId: string
): Promise<ConversationEntry[]> {
  const ctx = await getContextById(db, contextId);
  if (!ctx) {
    return [];
  }
  return Array.isArray(ctx.conversationHistory)
    ? (ctx.conversationHistory as ConversationEntry[])
    : [];
}

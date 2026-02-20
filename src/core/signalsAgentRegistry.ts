/**
 * Signals Agent Registry for querying enabled signals agents.
 */

import { getDb } from "../db/client.js";
import { listSignalsAgentsByTenant } from "../db/repositories/creative-agent.js";
import { logger } from "./logger.js";

export interface SignalItem {
  id: string;
  name: string;
  description?: string;
  type?: string;
  source_agent: string;
}

export async function discoverSignals(tenantId: string): Promise<SignalItem[]> {
  const db = getDb();
  const agents = await listSignalsAgentsByTenant(db, tenantId);
  const signals: SignalItem[] = [];

  for (const agent of agents) {
    try {
      // Use AbortSignal to avoid hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), agent.timeout * 1000 || 5000);
      
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (agent.authType && agent.authHeader && agent.authCredentials) {
        headers[agent.authHeader] = agent.authCredentials;
      }
      
      // Trim trailing slash for cleaner URL building
      const url = agent.agentUrl.replace(/\/$/, "");
      const response = await fetch(`${url}/signals`, {
        headers,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        logger.warn({ agentUrl: agent.agentUrl, status: response.status }, "Signals agent returned non-OK");
        continue;
      }

      const data = await response.json();
      const agentSignals = Array.isArray(data.signals) ? data.signals : (Array.isArray(data) ? data : []);
      
      for (const sig of agentSignals) {
        if (sig && typeof sig === "object") {
          signals.push({
            id: String((sig as Record<string, unknown>).id ?? ""),
            name: String((sig as Record<string, unknown>).name ?? "Unknown Signal"),
            description: (sig as Record<string, unknown>).description ? String((sig as Record<string, unknown>).description) : undefined,
            type: (sig as Record<string, unknown>).type ? String((sig as Record<string, unknown>).type) : undefined,
            source_agent: agent.name,
          });
        }
      }
    } catch (err) {
      logger.error({ agentUrl: agent.agentUrl, err }, "Failed to fetch from signals agent");
    }
  }

  return signals;
}

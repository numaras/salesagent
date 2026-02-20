/**
 * Signals tools: get_signals, activate_signal.
 */

import type { ToolContext } from "../core/auth/types.js";
import { discoverSignals } from "../core/signalsAgentRegistry.js";

export async function runGetSignals(
  ctx: ToolContext,
  args: { brief?: string }
) {
  const allSignals = await discoverSignals(ctx.tenantId);
  
  let signals = allSignals;
  if (args.brief && typeof args.brief === "string") {
    const term = args.brief.toLowerCase();
    signals = signals.filter(s => 
      s.name.toLowerCase().includes(term) || 
      (s.description && s.description.toLowerCase().includes(term))
    );
  }
  
  return { signals };
}

export async function runActivateSignal(
  _ctx: ToolContext,
  args: { signal_id: string }
) {
  return { status: "activated", signal_id: args.signal_id };
}

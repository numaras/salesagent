import type { AiConfig } from "../config.js";
import { callLlm } from "../factory.js";

export interface ReviewResult {
  decision: "approve" | "reject" | "review";
  confidence: number;
  reason: string;
}

const SYSTEM_PROMPT = `You are an ad creative compliance reviewer. Evaluate the provided creative against advertising policy guidelines including:
- No misleading claims or deceptive content
- No prohibited content (hate speech, violence, adult content)
- Proper disclosures and disclaimers where required
- Brand safety and appropriateness

Respond ONLY with a JSON object: { "decision": "approve" | "reject" | "review", "confidence": 0-1, "reason": "explanation" }`;

export async function reviewCreative(
  config: AiConfig,
  creativeName: string,
  creativeData: Record<string, unknown>
): Promise<ReviewResult> {
  const userPrompt = `Review this ad creative:\nName: ${creativeName}\nData: ${JSON.stringify(creativeData)}`;

  try {
    const raw = await callLlm(config, SYSTEM_PROMPT, userPrompt);
    if (!raw) return fallback();

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return fallback();

    const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
    const decision = parsed["decision"];
    const confidence = parsed["confidence"];
    const reason = parsed["reason"];

    if (
      (decision === "approve" || decision === "reject" || decision === "review") &&
      typeof confidence === "number" &&
      typeof reason === "string"
    ) {
      return { decision, confidence, reason };
    }
    return fallback();
  } catch {
    return fallback();
  }
}

function fallback(): ReviewResult {
  return { decision: "review", confidence: 0, reason: "AI parsing failed" };
}

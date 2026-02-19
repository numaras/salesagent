import type { AiConfig } from "../config.js";
import { callLlm } from "../factory.js";

export interface PolicyComplianceResult {
  compliant: boolean;
  violations: string[];
}

const SYSTEM_PROMPT = `You are an advertising policy compliance checker. Evaluate whether the advertiser and product description comply with the given policy rules. Identify any violations.

Respond ONLY with a JSON object: { "compliant": true/false, "violations": ["violation1", ...] }`;

export async function checkPolicyCompliance(
  config: AiConfig,
  advertiserName: string,
  productDescription: string,
  policyRules: string
): Promise<PolicyComplianceResult> {
  const userPrompt = `Check compliance:\nAdvertiser: ${advertiserName}\nProduct: ${productDescription}\nPolicy rules: ${policyRules}`;

  try {
    const raw = await callLlm(config, SYSTEM_PROMPT, userPrompt);
    if (!raw) return fallback();

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return fallback();

    const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
    const compliant = parsed["compliant"];
    const violations = parsed["violations"];

    if (typeof compliant === "boolean" && Array.isArray(violations)) {
      return {
        compliant,
        violations: violations.filter((v): v is string => typeof v === "string"),
      };
    }
    return fallback();
  } catch {
    return fallback();
  }
}

function fallback(): PolicyComplianceResult {
  return { compliant: true, violations: [] };
}

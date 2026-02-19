export interface AiConfig {
  provider: "gemini" | "openai" | "anthropic";
  model: string;
  apiKey: string;
}

export function getAiConfig(_tenantId?: string): AiConfig | null {
  const geminiKey = process.env["GEMINI_API_KEY"];
  if (geminiKey) {
    return { provider: "gemini", model: "gemini-pro", apiKey: geminiKey };
  }
  return null;
}

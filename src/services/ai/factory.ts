import type { AiConfig } from "./config.js";

interface GeminiResponse {
  candidates?: { content: { parts: { text: string }[] } }[];
}

interface OpenAiResponse {
  choices?: { message: { content: string } }[];
}

export async function callLlm(
  config: AiConfig,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  try {
    if (config.provider === "gemini") {
      return await callGemini(config, systemPrompt, userPrompt);
    }
    if (config.provider === "openai") {
      return await callOpenAi(config, systemPrompt, userPrompt);
    }
    throw new Error(`Unsupported AI provider: ${config.provider}`);
  } catch {
    return "";
  }
}

async function callGemini(
  config: AiConfig,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: systemPrompt + "\n\n" + userPrompt }] }],
    }),
  });
  const data = (await res.json()) as GeminiResponse;
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

async function callOpenAi(
  config: AiConfig,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const url = "https://api.openai.com/v1/chat/completions";
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });
  const data = (await res.json()) as OpenAiResponse;
  return data.choices?.[0]?.message?.content ?? "";
}

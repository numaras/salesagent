import type { AiConfig } from "../config.js";
import { callLlm } from "../factory.js";

export interface RankableProduct {
  product_id: string;
  name: string;
  description: string;
}

const SYSTEM_PROMPT = `You are a product relevance ranker. Given an advertiser's brief and a list of available ad products, rank the products by relevance to the brief. Return ONLY a JSON array of product_id strings in ranked order (most relevant first).`;

export async function rankProducts(
  config: AiConfig,
  brief: string,
  products: RankableProduct[]
): Promise<string[]> {
  const originalOrder = products.map((p) => p.product_id);

  const productList = products
    .map((p) => `- ${p.product_id}: ${p.name} — ${p.description}`)
    .join("\n");
  const userPrompt = `Brief: ${brief}\n\nProducts:\n${productList}`;

  try {
    const raw = await callLlm(config, SYSTEM_PROMPT, userPrompt);
    if (!raw) return originalOrder;

    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return originalOrder;

    const parsed = JSON.parse(jsonMatch[0]) as unknown[];
    const ids = parsed.filter((v): v is string => typeof v === "string");

    if (ids.length === 0) return originalOrder;

    const knownIds = new Set(originalOrder);
    const ranked = ids.filter((id) => knownIds.has(id));
    const missing = originalOrder.filter((id) => !ranked.includes(id));
    return [...ranked, ...missing];
  } catch {
    return originalOrder;
  }
}

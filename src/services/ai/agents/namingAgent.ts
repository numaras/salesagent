import type { AiConfig } from "../config.js";
import { callLlm } from "../factory.js";

const SYSTEM_PROMPT = `You are a media order naming assistant. Generate a concise, descriptive order name suitable for an ad server. The name should include the advertiser, product type, and timeframe. Return ONLY the name, no extra text or quotes.`;

export async function generateOrderName(
  config: AiConfig,
  advertiserName: string,
  productName: string,
  startDate: string
): Promise<string> {
  const userPrompt = `Generate an order name for:\nAdvertiser: ${advertiserName}\nProduct: ${productName}\nStart date: ${startDate}`;
  const result = await callLlm(config, SYSTEM_PROMPT, userPrompt);
  return result.trim() || `${advertiserName} - ${productName} - ${startDate}`;
}

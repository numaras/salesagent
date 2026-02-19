/**
 * Slack webhook integration for operational notifications.
 */

import { ValidationError } from "../core/errors.js";

export async function sendSlack(
  webhookUrl: string,
  message: string
): Promise<void> {
  if (!webhookUrl) throw new ValidationError("Slack webhook URL is required");

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: message }),
  });

  if (!response.ok) {
    throw new Error(
      `Slack webhook failed: ${response.status} ${response.statusText}`
    );
  }
}

export async function notifyMediaBuyCreated(
  webhookUrl: string,
  mediaBuyId: string,
  advertiserName: string
): Promise<void> {
  const message = `New media buy created: *${mediaBuyId}* for advertiser *${advertiserName}*`;
  await sendSlack(webhookUrl, message);
}

export async function notifyCreativeReviewed(
  webhookUrl: string,
  creativeId: string,
  decision: string
): Promise<void> {
  const message = `Creative *${creativeId}* review completed: *${decision}*`;
  await sendSlack(webhookUrl, message);
}

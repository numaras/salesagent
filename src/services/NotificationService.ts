/**
 * Notification service interface: push to webhook URL, Slack, etc.
 * Implementations can use HTTP client and optional job queue.
 */

import { processWebhookWithRetry } from "./WebhookDeliveryService.js";
import crypto from "crypto";

export interface NotificationPayload {
  event: string;
  tenantId: string;
  [key: string]: unknown;
}

export interface NotificationService {
  sendWebhook(url: string, payload: NotificationPayload): Promise<void>;
  sendSlack(webhookUrl: string, message: string): Promise<void>;
}

/** No-op implementation for development; replace with HTTP client + optional queue. */
export const noopNotificationService: NotificationService = {
  async sendWebhook() {},
  async sendSlack() {},
};

export const realNotificationService: NotificationService = {
  async sendWebhook(url: string, payload: NotificationPayload) {
    await processWebhookWithRetry(crypto.randomUUID(), url, payload);
  },
  async sendSlack(webhookUrl: string, message: string) {
    try {
      await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: message }),
      });
    } catch (err) {
      console.error("Failed to send Slack notification", err);
    }
  },
};

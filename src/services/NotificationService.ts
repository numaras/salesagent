/**
 * Notification service interface: push to webhook URL, Slack, etc.
 * Implementations can use HTTP client and optional job queue.
 */

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

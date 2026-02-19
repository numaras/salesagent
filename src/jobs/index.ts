/**
 * Job registration and lifecycle entry point.
 */

import { JobScheduler } from "./scheduler.js";
import { processWebhookQueue } from "./webhookScheduler.js";
import { pollMediaBuyStatus } from "./mediaBuyStatusJob.js";

const WEBHOOK_INTERVAL_MS = 60_000;
const MEDIA_BUY_POLL_INTERVAL_MS = 300_000;

let scheduler: JobScheduler | null = null;

export function startJobs(): void {
  scheduler = new JobScheduler();
  scheduler.register("webhookDelivery", processWebhookQueue, WEBHOOK_INTERVAL_MS);
  scheduler.register("mediaBuyStatusPoll", pollMediaBuyStatus, MEDIA_BUY_POLL_INTERVAL_MS);
  scheduler.start();
}

export function stopJobs(): void {
  scheduler?.stop();
  scheduler = null;
}

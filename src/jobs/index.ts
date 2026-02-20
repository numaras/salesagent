/**
 * Job registration and lifecycle entry point.
 */

import { JobScheduler } from "./scheduler.js";
import { processWebhookQueue } from "./webhookScheduler.js";
import { pollMediaBuyStatus } from "./mediaBuyStatusJob.js";
import { syncInventory } from "../services/GamInventoryService.js";
import { syncTenantOrders } from "../services/GamOrdersService.js";
import { getDb } from "../db/client.js";
import { adapterConfig } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { logger } from "../core/logger.js";

const WEBHOOK_INTERVAL_MS = 60_000;
const MEDIA_BUY_POLL_INTERVAL_MS = 300_000;
const GAM_SYNC_INTERVAL_MS = 21_600_000; // 6 hours

let scheduler: JobScheduler | null = null;

async function runGamSyncs() {
  const db = getDb();
  try {
    const configs = await db
      .select()
      .from(adapterConfig)
      .where(eq(adapterConfig.adapterType, "google_ad_manager"));

    for (const config of configs) {
      const tenantId = config.tenantId;
      try {
        const syncId = `sync_${crypto.randomUUID().slice(0, 8)}`;
        await syncInventory(tenantId, syncId);
        await syncTenantOrders(tenantId, syncId);
        logger.info({ tenantId }, "GAM sync completed successfully");
      } catch (err) {
        logger.error({ tenantId, err }, "Failed GAM sync");
      }
    }
  } catch (err) {
    logger.error({ err }, "Failed to fetch GAM configs for sync");
  }
}

export function startJobs(): void {
  scheduler = new JobScheduler();
  scheduler.register("webhookDelivery", processWebhookQueue, WEBHOOK_INTERVAL_MS);
  scheduler.register("mediaBuyStatusPoll", pollMediaBuyStatus, MEDIA_BUY_POLL_INTERVAL_MS);
  scheduler.register("gamSync", runGamSyncs, GAM_SYNC_INTERVAL_MS);
  scheduler.start();
}

export function stopJobs(): void {
  scheduler?.stop();
  scheduler = null;
}

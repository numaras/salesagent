/**
 * Background job: poll active media buy statuses.
 */

import { inArray, eq } from "drizzle-orm";
import { getDb } from "../db/client.js";
import { mediaBuys } from "../db/schema.js";
import { getAdapter, ensurePrincipal } from "../core/adapterRegistry.js";
import { logger } from "../core/logger.js";

export async function pollMediaBuyStatus(): Promise<void> {
  const db = getDb();
  
  try {
    const activeBuys = await db
      .select()
      .from(mediaBuys)
      .where(inArray(mediaBuys.status, ["pending", "active"]));

    for (const buy of activeBuys) {
      try {
        const principal = ensurePrincipal({ principalId: buy.principalId });
        const adapter = await getAdapter(buy.tenantId, principal, false);
        
        const res = await adapter.check_media_buy_status(buy.mediaBuyId, new Date());
        
        if (res.status && res.status !== buy.status) {
          await db
            .update(mediaBuys)
            .set({ status: res.status, updatedAt: new Date() })
            .where(eq(mediaBuys.mediaBuyId, buy.mediaBuyId));
          
          logger.info({ mediaBuyId: buy.mediaBuyId, newStatus: res.status }, "Media buy status updated");
        }
      } catch (err) {
        logger.error({ mediaBuyId: buy.mediaBuyId, err }, "Failed to poll media buy status");
      }
    }
  } catch (err) {
    logger.error({ err }, "Error in pollMediaBuyStatus job");
  }
}

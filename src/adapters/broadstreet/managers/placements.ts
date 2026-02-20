import type { BroadstreetClient } from "../client.js";

export async function createPlacement(
  client: BroadstreetClient,
  campaignId: string,
  advertisementId: string,
  zoneId: string
): Promise<any> {
  return client.post(`/networks/${client.networkId}/campaigns/${campaignId}/advertisements/${advertisementId}/zones/${zoneId}`, {});
}

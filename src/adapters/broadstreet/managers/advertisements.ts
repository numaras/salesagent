import type { BroadstreetClient } from "../client.js";

export async function createAdvertisement(
  client: BroadstreetClient,
  campaignId: string,
  payload: Record<string, unknown>
): Promise<any> {
  return client.post(`/networks/${client.networkId}/campaigns/${campaignId}/advertisements`, payload);
}

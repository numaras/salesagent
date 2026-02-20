import type { BroadstreetClient } from "../client.js";

export async function createCampaign(client: BroadstreetClient, payload: Record<string, unknown>): Promise<any> {
  return client.post(`/networks/${client.networkId}/campaigns`, payload);
}

export async function getCampaignReport(client: BroadstreetClient, campaignId: string): Promise<any> {
  return client.get(`/networks/${client.networkId}/campaigns/${campaignId}/report`);
}

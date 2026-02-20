import type { BroadstreetClient } from "../client.js";

export async function getZones(client: BroadstreetClient): Promise<any> {
  return client.get(`/networks/${client.networkId}/zones`);
}

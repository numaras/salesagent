import { StatementBuilder } from "@guardian/google-admanager-api";
import type { GamClientWrapper } from "../client.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function discoverAdUnits(client: GamClientWrapper): Promise<{ adUnits: any[] }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adUnits: any[] = [];
  const inventoryService = await client.getInventoryService();
  const PAGE_SIZE = 500;
  let offset = 0;

  while (true) {
    const statement = new StatementBuilder().limit(PAGE_SIZE).offset(offset).toStatement();
    const page = await inventoryService.getAdUnitsByStatement(statement);
    const results = page.results || [];
    adUnits.push(...results);

    if (results.length < PAGE_SIZE) {
      break;
    }
    offset += PAGE_SIZE;
  }

  return { adUnits };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function discoverPlacements(client: GamClientWrapper): Promise<{ placements: any[] }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const placements: any[] = [];
  const placementService = await client.getPlacementService();
  const PAGE_SIZE = 500;
  let offset = 0;

  while (true) {
    const statement = new StatementBuilder().limit(PAGE_SIZE).offset(offset).toStatement();
    const page = await placementService.getPlacementsByStatement(statement);
    const results = page.results || [];
    placements.push(...results);

    if (results.length < PAGE_SIZE) {
      break;
    }
    offset += PAGE_SIZE;
  }

  return { placements };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getCustomTargetingKeys(client: GamClientWrapper): Promise<{ keys: any[] }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const keys: any[] = [];
  const customTargetingService = await client.getCustomTargetingService();
  const PAGE_SIZE = 500;
  let offset = 0;

  while (true) {
    const statement = new StatementBuilder().limit(PAGE_SIZE).offset(offset).toStatement();
    const page = await customTargetingService.getCustomTargetingKeysByStatement(statement);
    const results = page.results || [];
    keys.push(...results);

    if (results.length < PAGE_SIZE) {
      break;
    }
    offset += PAGE_SIZE;
  }

  return { keys };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getCustomTargetingValues(
  client: GamClientWrapper,
  keyId: number
): Promise<{ values: any[] }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const values: any[] = [];
  const customTargetingService = await client.getCustomTargetingService();
  const PAGE_SIZE = 500;
  let offset = 0;

  while (true) {
    const statement = new StatementBuilder()
      .where("customTargetingKeyId = :keyId")
      .addValue("keyId", { value: keyId.toString() } as any) // AddValue needs a value object. Let's see what works, or just pass keyId
      .limit(PAGE_SIZE)
      .offset(offset)
      .toStatement();
    const page = await customTargetingService.getCustomTargetingValuesByStatement(statement);
    const results = page.results || [];
    values.push(...results);

    if (results.length < PAGE_SIZE) {
      break;
    }
    offset += PAGE_SIZE;
  }

  return { values };
}

/**
 * Creative management — create and associate creatives in GAM.
 */

import type { GamClientWrapper } from "../client.js";

interface CreateCreativeParams {
  name: string;
  advertiserId: string;
  size: { width: number; height: number };
}

/**
 * Create a creative in GAM.
 */
export async function createCreative(
  client: GamClientWrapper,
  params: CreateCreativeParams
): Promise<{ creativeId: string }> {
  const creativeService = await client.getCreativeService();

  const creative = {
    attributes: { "xsi:type": "ThirdPartyCreative" },
    name: params.name,
    advertiserId: params.advertiserId,
    size: {
      width: params.size.width,
      height: params.size.height,
      isAspectRatio: false,
    },
    snippet: "<!-- Third Party Tag -->"
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await creativeService.createCreatives([creative as any]);

  if (!result || result.length === 0) {
    throw new Error("Failed to create creative in GAM");
  }

  return { creativeId: result[0].id.toString() };
}

/**
 * Associate an existing creative with a line item via
 * LineItemCreativeAssociationService.
 */
export async function associateCreativeWithLineItem(
  client: GamClientWrapper,
  lineItemId: string,
  creativeId: string
): Promise<{ associated: boolean }> {
  const licaService = await client.getLineItemCreativeAssociationService();

  const lica = {
    lineItemId,
    creativeId,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await licaService.createLineItemCreativeAssociations([lica as any]);

  return { associated: true };
}

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
 * TODO: Call CreativeService.createCreatives with proper creative template.
 */
export async function createCreative(
  _client: GamClientWrapper,
  _params: CreateCreativeParams
): Promise<{ creativeId: string }> {
  return { creativeId: "stub" };
}

/**
 * Associate an existing creative with a line item via
 * LineItemCreativeAssociationService.
 * TODO: Call createLineItemCreativeAssociations.
 */
export async function associateCreativeWithLineItem(
  _client: GamClientWrapper,
  _lineItemId: string,
  _creativeId: string
): Promise<{ associated: boolean }> {
  return { associated: true };
}

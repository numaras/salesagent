/**
 * Auth result attached to request/context for tools.
 */

import type { PrincipalRow } from "../../db/repositories/principal.js";
import type { TestContext } from "../testingHooks.js";

export interface ToolContext {
  tenantId: string;
  principalId: string | null;
  principal: PrincipalRow | null;
  /** When token was the tenant admin token, principalId is `${tenantId}_admin` */
  isAdminToken?: boolean;
  testContext?: TestContext | null;
}

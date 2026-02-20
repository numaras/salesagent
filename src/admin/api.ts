/**
 * Admin API: REST routes for tenants, products, etc.
 * Uses shared headersFromNodeRequest and domain errors.
 */

import { type Request, type Response, Router } from "express";
import { createAuthRouter } from "./routes/auth.js";
import { createTenantsRouter } from "./routes/tenants.js";
import { createProductsRouter } from "./routes/products.js";
import { createPrincipalsRouter } from "./routes/principals.js";
import { createMediaBuysRouter } from "./routes/mediaBuys.js";
import { createUsersRouter } from "./routes/users.js";
import { createSettingsRouter } from "./routes/settings.js";
import { createWorkflowsRouter } from "./routes/workflows.js";
import { createCreativesRouter } from "./routes/creatives.js";
import { createPropertiesRouter } from "./routes/properties.js";
import { createPublisherPartnersRouter } from "./routes/publisherPartners.js";
import { createCreativeAgentsRouter } from "./routes/creativeAgents.js";
import { createInventoryRouter } from "./routes/inventory.js";
import { createPolicyRouter } from "./routes/policy.js";
import { createOperationsRouter } from "./routes/operations.js";
import { createOnboardingRouter } from "./routes/onboarding.js";
import { createOidcRouter } from "./routes/oidc.js";
import { createGamRouter } from "./routes/gam.js";
import { createInventoryProfilesRouter } from "./routes/inventoryProfiles.js";

export function createAdminRouter(): Router {
  const router = Router();

  router.get("/api/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", service: "admin-api" });
  });

  router.use("/api", createAuthRouter());
  router.use("/api", createTenantsRouter());
  router.use("/api", createProductsRouter());
  router.use("/api", createPrincipalsRouter());
  router.use("/api", createMediaBuysRouter());
  router.use("/api", createUsersRouter());
  router.use("/api", createSettingsRouter());
  router.use("/api", createWorkflowsRouter());
  router.use("/api", createCreativesRouter());
  router.use("/api", createPropertiesRouter());
  router.use("/api", createPublisherPartnersRouter());
  router.use("/api", createCreativeAgentsRouter());
  router.use("/api", createInventoryRouter());
  router.use("/api", createPolicyRouter());
  router.use("/api", createOperationsRouter());
  router.use("/api", createOnboardingRouter());
  router.use("/api", createOidcRouter());
  router.use("/api", createGamRouter());
  router.use("/api", createInventoryProfilesRouter());

  return router;
}

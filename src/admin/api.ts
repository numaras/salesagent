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

  return router;
}

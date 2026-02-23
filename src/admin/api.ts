/**
 * Admin API: REST routes for tenants, products, etc.
 * Uses shared headersFromNodeRequest and domain errors.
 */

import { type Request, type Response, type NextFunction, Router } from "express";
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
import { createActivityStreamRouter } from "./routes/activityStream.js";
import { createFormatSearchRouter } from "./routes/formatSearch.js";
import { createSchemasRouter } from "./routes/schemas.js";
import { createSignalsAgentsRouter } from "./routes/signalsAgents.js";
import { createInventoryRouter } from "./routes/inventory.js";
import { createPolicyRouter } from "./routes/policy.js";
import { createOperationsRouter } from "./routes/operations.js";
import { createOnboardingRouter } from "./routes/onboarding.js";
import { createOidcRouter } from "./routes/oidc.js";
import { createGamRouter } from "./routes/gam.js";
import { createInventoryProfilesRouter } from "./routes/inventoryProfiles.js";

/**
 * Routes that do NOT require authentication.
 * These are paths AFTER the /api prefix is stripped by Express
 * (the middleware is mounted at router.use("/api", ...) so req.path
 * arrives here as e.g. "/oidc/config", not "/api/oidc/config").
 */
const PUBLIC_PATHS = [
  "/auth/test-login",
  "/auth/google",
  "/auth/google/callback",
  "/auth/logout",
  "/auth/session",
  "/oidc/config",
  "/oidc/login",
  "/oidc/callback",
  "/onboarding/status",
  "/health",
];

function isPrivilegedRole(role: unknown): boolean {
  if (typeof role !== "string") return false;
  const normalized = role.trim().toLowerCase();
  return normalized === "admin" || normalized === "owner" || normalized === "super_admin";
}

function requireSameOriginForMutations(req: Request, res: Response, next: NextFunction): void {
  const method = req.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    next();
    return;
  }

  const host = req.get("host");
  if (!host) {
    res.status(403).json({ error: "CSRF_CHECK_FAILED", message: "Missing host header" });
    return;
  }

  const origin = req.get("origin");
  if (origin) {
    try {
      if (new URL(origin).host === host) {
        next();
        return;
      }
    } catch {
      // Fall through to block.
    }
  }

  const referer = req.get("referer");
  if (referer) {
    try {
      if (new URL(referer).host === host) {
        next();
        return;
      }
    } catch {
      // Fall through to block.
    }
  }

  res.status(403).json({ error: "CSRF_CHECK_FAILED", message: "Origin check failed" });
}

function requireSession(req: Request, res: Response, next: NextFunction): void {
  const path = req.path;
  const isPublic = PUBLIC_PATHS.some((p) => path === p || path.startsWith(p + "/"));
  if (isPublic) { next(); return; }

  const sess = req.session as unknown as Record<string, unknown>;
  if (!sess.authenticated) {
    res.status(401).json({ error: "AUTH_REQUIRED", message: "Authentication required. Please log in." });
    return;
  }
  if (!isPrivilegedRole(sess.role)) {
    res.status(403).json({ error: "FORBIDDEN", message: "Admin role required." });
    return;
  }
  next();
}

export function createAdminRouter(): Router {
  const router = Router();

  router.use("/api", requireSameOriginForMutations);

  // Apply auth middleware to all /api/* routes before any router is mounted
  router.use("/api", requireSession);

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
  router.use("/api", createSignalsAgentsRouter());
  router.use("/api", createActivityStreamRouter());
  router.use("/api", createFormatSearchRouter());
  router.use("/api", createSchemasRouter());
  router.use("/api", createInventoryRouter());
  router.use("/api", createPolicyRouter());
  router.use("/api", createOperationsRouter());
  router.use("/api", createOnboardingRouter());
  router.use("/api", createOidcRouter());
  router.use("/api", createGamRouter());
  router.use("/api", createInventoryProfilesRouter());

  return router;
}

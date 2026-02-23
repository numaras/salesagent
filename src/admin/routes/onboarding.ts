import { type Request, type Response, Router } from "express";
import { randomUUID } from "node:crypto";
import { count } from "drizzle-orm";
import { toHttpError, ValidationError } from "../../core/errors.js";
import { getDb, withTransaction, type DrizzleDb } from "../../db/client.js";
import { getChecklist } from "../../services/SetupChecklistService.js";
import {
  tenants,
  adapterConfig,
  currencyLimits,
  principals,
  products,
  pricingOptions,
} from "../../db/schema.js";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
}

export function createOnboardingRouter(): Router {
  const router = Router();

  router.get("/onboarding/status", async (_req: Request, res: Response) => {
    try {
      const db = getDb();
      const rows = await db.select().from(tenants).limit(1);
      const setupComplete = rows.length > 0;
      res.json({
        setupComplete,
        ...(setupComplete && rows[0] ? { tenantId: rows[0].tenantId } : {}),
      });
    } catch (err) {
      const { status, body } = toHttpError(err);
      res.status(status).json(body);
    }
  });

  router.post("/onboarding/setup", async (req: Request, res: Response) => {
    try {
      const db = getDb();
      const [{ value }] = await db.select({ value: count() }).from(tenants);
      const isFirstSetup = Number(value) === 0;
      const onboardingSecret = process.env.ONBOARDING_SECRET;
      const providedSecret = req.headers["x-onboarding-secret"];

      if (!isFirstSetup && (!onboardingSecret || providedSecret !== onboardingSecret)) {
        res.status(403).json({
          error: "FORBIDDEN",
          message: "Setup is complete. Use the admin panel to manage tenants.",
        });
        return;
      }

      const { tenantName, subdomain, adapterType } = req.body as {
        tenantName?: string;
        subdomain?: string;
        adapterType?: string;
      };

      if (!tenantName || typeof tenantName !== "string") {
        throw new ValidationError("tenantName is required");
      }
      if (!subdomain || typeof subdomain !== "string") {
        throw new ValidationError("subdomain is required");
      }
      if (!adapterType || typeof adapterType !== "string") {
        throw new ValidationError("adapterType is required");
      }

      const tenantId = slugify(subdomain);

      const tenant = await withTransaction(async (tx: DrizzleDb) => {
        const [row] = await tx
          .insert(tenants)
          .values({
            tenantId,
            name: tenantName,
            subdomain,
            isActive: true,
            adServer: adapterType,
          })
          .returning();

        await tx.insert(adapterConfig).values({
          tenantId,
          adapterType,
          configJson: {},
        });

        await tx.insert(currencyLimits).values({
          tenantId,
          currencyCode: "USD",
          minPackageBudget: "100.00",
          maxDailyPackageSpend: "10000.00",
        });

        return row!;
      });

      res.status(201).json({
        tenant_id: tenant.tenantId,
        name: tenant.name,
        subdomain: tenant.subdomain,
        ad_server: tenant.adServer,
        created_at: tenant.createdAt,
      });
    } catch (err) {
      const { status, body } = toHttpError(err);
      res.status(status).json(body);
    }
  });

  router.post("/onboarding/create-principal", async (req: Request, res: Response) => {
    try {
      const db = getDb();
      const { name, principalId } = req.body as {
        name?: string;
        principalId?: string;
      };

      if (!name || typeof name !== "string") {
        throw new ValidationError("name is required");
      }

      const rows = await db.select().from(tenants).limit(1);
      if (!rows[0]) {
        throw new ValidationError("No tenant found. Run setup first.");
      }
      const tenantId = rows[0].tenantId;
      const pid = principalId || slugify(name);
      const accessToken = randomUUID();

      const [row] = await db
        .insert(principals)
        .values({
          tenantId,
          principalId: pid,
          name,
          accessToken,
          platformMappings: {},
        })
        .returning();

      res.status(201).json({
        principal_id: row!.principalId,
        name: row!.name,
        access_token: accessToken,
        tenant_id: tenantId,
      });
    } catch (err) {
      const { status, body } = toHttpError(err);
      res.status(status).json(body);
    }
  });

  router.post("/onboarding/create-product", async (req: Request, res: Response) => {
    try {
      const db = getDb();
      const { name, description, deliveryType, pricingModel, rate } = req.body as {
        name?: string;
        description?: string;
        deliveryType?: string;
        pricingModel?: string;
        rate?: number;
      };

      if (!name || typeof name !== "string") {
        throw new ValidationError("name is required");
      }
      if (!deliveryType || typeof deliveryType !== "string") {
        throw new ValidationError("deliveryType is required");
      }
      if (!pricingModel || typeof pricingModel !== "string") {
        throw new ValidationError("pricingModel is required");
      }
      if (rate == null || typeof rate !== "number") {
        throw new ValidationError("rate is required and must be a number");
      }

      const rows = await db.select().from(tenants).limit(1);
      if (!rows[0]) {
        throw new ValidationError("No tenant found. Run setup first.");
      }
      const tenantId = rows[0].tenantId;
      const productId = slugify(name);

      const [productRow] = await db
        .insert(products)
        .values({
          tenantId,
          productId,
          name,
          description: description ?? null,
          deliveryType,
          formatIds: [],
          targetingTemplate: {},
          isCustom: false,
        })
        .returning();

      await db.insert(pricingOptions).values({
        tenantId,
        productId,
        pricingModel,
        rate: rate.toFixed(2),
        currency: "USD",
        isFixed: true,
      });

      res.status(201).json({
        product_id: productRow!.productId,
        name: productRow!.name,
        delivery_type: productRow!.deliveryType,
        pricing_model: pricingModel,
        rate,
      });
    } catch (err) {
      const { status, body } = toHttpError(err);
      res.status(status).json(body);
    }
  });

  router.get("/onboarding/checklist", async (_req: Request, res: Response) => {
    try {
      const db = getDb();
      const rows = await db.select().from(tenants).limit(1);
      if (!rows[0]) {
        res.json({ items: [] });
        return;
      }
      const checklist = await getChecklist(rows[0].tenantId);
      res.json(checklist);
    } catch (err) {
      const { status, body } = toHttpError(err);
      res.status(status).json(body);
    }
  });

  return router;
}

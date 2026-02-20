import { type Request, type Response, Router } from "express";
import { and, eq } from "drizzle-orm";
import { resolveFromHeaders, toToolContext } from "../../core/auth/authService.js";
import { NotFoundError, TenantError, toHttpError, ValidationError } from "../../core/errors.js";
import { headersFromNodeRequest } from "../../core/httpHeaders.js";
import { getDb, withTransaction } from "../../db/client.js";
import { listProductsByTenant, getProductById, listPricingOptionsByProduct } from "../../db/repositories/product.js";
import { products, pricingOptions } from "../../db/schema.js";

function paramStr(v: string | string[] | undefined): string | undefined {
  return typeof v === "string" ? v : v?.[0];
}

export function createProductsRouter(): Router {
  const router = Router();

  router.get("/products", async (req: Request, res: Response) => {
    try {
      const headers = headersFromNodeRequest(req);
      const result = await resolveFromHeaders(headers);
      const ctx = toToolContext(result);
      if (!ctx?.tenantId) throw new TenantError();
      const db = getDb();
      const rows = await listProductsByTenant(db, ctx.tenantId);
      res.json({
        products: rows.map((r) => ({
          product_id: r.productId,
          name: r.name,
          description: r.description,
          delivery_type: r.deliveryType,
          is_custom: r.isCustom,
        })),
      });
    } catch (err) {
      const { status, body } = toHttpError(err);
      res.status(status).json(body);
    }
  });

  router.get("/products/:productId", async (req: Request, res: Response) => {
    try {
      const headers = headersFromNodeRequest(req);
      const result = await resolveFromHeaders(headers);
      const ctx = toToolContext(result);
      if (!ctx?.tenantId) throw new TenantError();
      const db = getDb();
      const productId = paramStr(req.params.productId);
      if (!productId) throw new NotFoundError("Product", "undefined");
      const row = await getProductById(db, ctx.tenantId, productId);
      if (!row) throw new NotFoundError("Product", productId);
      
      const options = await listPricingOptionsByProduct(db, ctx.tenantId, productId);
      
      res.json({
        product_id: row.productId,
        name: row.name,
        description: row.description,
        delivery_type: row.deliveryType,
        format_ids: row.formatIds,
        targeting_template: row.targetingTemplate,
        measurement: row.measurement,
        is_custom: row.isCustom,
        property_tags: row.propertyTags,
        pricing_options: options.map(o => ({
          pricing_model: o.pricingModel,
          rate: o.rate,
          currency: o.currency
        })),
      });
    } catch (err) {
      const { status, body } = toHttpError(err);
      res.status(status).json(body);
    }
  });

  router.post("/products", async (req: Request, res: Response) => {
    try {
      const headers = headersFromNodeRequest(req);
      const result = await resolveFromHeaders(headers);
      const ctx = toToolContext(result);
      if (!ctx?.tenantId) throw new TenantError();
      const body = req.body as Record<string, unknown>;
      if (!body.product_id || !body.name || !body.delivery_type) {
        throw new ValidationError("product_id, name, and delivery_type are required");
      }
      
      const row = await withTransaction(async (tx) => {
        const inserted = await tx
          .insert(products)
          .values({
            tenantId: ctx.tenantId,
            productId: body.product_id as string,
            name: body.name as string,
            description: (body.description as string) ?? null,
            deliveryType: body.delivery_type as string,
            formatIds: (body.format_ids as unknown) ?? [],
            targetingTemplate: (body.targeting_template as unknown) ?? {},
            measurement: (body.measurement as unknown) ?? null,
            isCustom: (body.is_custom as boolean) ?? false,
            propertyTags: (body.property_tags as unknown) ?? null,
            implementationConfig: (body.implementation_config as unknown) ?? null,
          })
          .returning();
        
        const pRow = inserted[0]!;
        
        const po = body.pricing_options as any[];
        if (Array.isArray(po) && po.length > 0) {
          await tx.insert(pricingOptions).values(
            po.map(p => ({
              tenantId: ctx.tenantId,
              productId: pRow.productId,
              pricingModel: p.pricing_model,
              rate: p.rate ? String(p.rate) : null,
              currency: p.currency,
              isFixed: false
            }))
          );
        }
        return pRow;
      });
      
      res.status(201).json({ product_id: row.productId, name: row.name });
    } catch (err) {
      const { status, body } = toHttpError(err);
      res.status(status).json(body);
    }
  });

  router.put("/products/:productId", async (req: Request, res: Response) => {
    try {
      const headers = headersFromNodeRequest(req);
      const result = await resolveFromHeaders(headers);
      const ctx = toToolContext(result);
      if (!ctx?.tenantId) throw new TenantError();
      const db = getDb();
      const productId = paramStr(req.params.productId);
      if (!productId) throw new NotFoundError("Product", "undefined");

      const existing = await getProductById(db, ctx.tenantId, productId);
      if (!existing) throw new NotFoundError("Product", productId);

      const body = req.body as Record<string, unknown>;
      
      const row = await withTransaction(async (tx) => {
        const updated = await tx
          .update(products)
          .set({
            name: (body.name as string) ?? existing.name,
            description: (body.description as string) ?? existing.description,
            deliveryType: (body.delivery_type as string) ?? existing.deliveryType,
            formatIds: (body.format_ids as unknown) ?? existing.formatIds,
            targetingTemplate: (body.targeting_template as unknown) ?? existing.targetingTemplate,
            measurement: (body.measurement as unknown) ?? existing.measurement,
            isCustom: (body.is_custom as boolean) ?? existing.isCustom,
            propertyTags: (body.property_tags as unknown) ?? existing.propertyTags,
            implementationConfig: (body.implementation_config as unknown) ?? existing.implementationConfig,
          })
          .where(and(eq(products.tenantId, ctx.tenantId), eq(products.productId, productId)))
          .returning();
          
        const pRow = updated[0]!;
        
        if (body.pricing_options) {
          await tx.delete(pricingOptions)
            .where(and(eq(pricingOptions.tenantId, ctx.tenantId), eq(pricingOptions.productId, productId)));
            
          const po = body.pricing_options as any[];
          if (Array.isArray(po) && po.length > 0) {
            await tx.insert(pricingOptions).values(
              po.map(p => ({
                tenantId: ctx.tenantId,
                productId: productId,
                pricingModel: p.pricing_model,
                rate: p.rate ? String(p.rate) : null,
                currency: p.currency,
                isFixed: false
              }))
            );
          }
        }
        
        return pRow;
      });

      res.json({ product_id: row.productId, name: row.name });
    } catch (err) {
      const { status, body } = toHttpError(err);
      res.status(status).json(body);
    }
  });

  router.delete("/products/:productId", async (req: Request, res: Response) => {
    try {
      const headers = headersFromNodeRequest(req);
      const result = await resolveFromHeaders(headers);
      const ctx = toToolContext(result);
      if (!ctx?.tenantId) throw new TenantError();
      const db = getDb();
      const productId = paramStr(req.params.productId);
      if (!productId) throw new NotFoundError("Product", "undefined");

      const existing = await getProductById(db, ctx.tenantId, productId);
      if (!existing) throw new NotFoundError("Product", productId);

      await db
        .delete(products)
        .where(and(eq(products.tenantId, ctx.tenantId), eq(products.productId, productId)));

      res.json({ success: true, product_id: productId });
    } catch (err) {
      const { status, body } = toHttpError(err);
      res.status(status).json(body);
    }
  });

  return router;
}
